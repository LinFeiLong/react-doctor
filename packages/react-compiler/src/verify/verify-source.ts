/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * ---
 *
 * Source-level entry point for the verifier. Compiles the input with the React
 * Compiler frontend and runs the verifier checks against the analyzed HIR,
 * captured at the `InferReactivePlaces` stage (reactivity + aliasing inferred,
 * before reactive scopes / memoization — i.e. the program "as written").
 */

import {transformFromAstSync} from '@babel/core';
import {parse as parseBabel} from '@babel/parser';
import BabelPluginReactCompiler, {
  type CompilerPipelineValue,
  type Logger,
  type PluginOptions,
  parseConfigPragmaForTests,
} from '../index';
import {noConditionalHook} from './checks/conditional-hook';
import {noEffectInfiniteLoop} from './checks/effect-infinite-loop';
import {effectMissingCleanup} from './checks/effect-missing-cleanup';
import {noRefReadInRender} from './checks/ref-access-in-render';
import {noResourceInRender} from './checks/resource-in-render';
import {noSetStateInRender} from './checks/set-state-in-render';
import {noUnstableJsxProp} from './checks/unstable-jsx-prop';
import {runChecks, type Check} from './run';
import {aggregateVerdict, type Finding, type VerifierReport} from './verdict';

const CHECKS: ReadonlyArray<Check> = [
  // Termination / convergence
  noEffectInfiniteLoop,
  noSetStateInRender,
  // Rules of Hooks
  noConditionalHook,
  // Render purity
  noRefReadInRender,
  // Effect correctness
  effectMissingCleanup,
  // Cross-component cascade
  noUnstableJsxProp,
  // Resource lifecycle
  noResourceInRender,
];

export interface VerifyOptions {
  filename?: string;
}

export function verifySource(
  code: string,
  options: VerifyOptions = {},
): VerifierReport {
  const filename = options.filename ?? 'Component.tsx';
  const findings: Array<Finding> = [];
  let analyzedFunctions = 0;

  const ast = parseBabel(code, {
    sourceFilename: filename,
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const config = parseConfigPragmaForTests('', {compilationMode: 'all'});
  const logger: Logger = {
    logEvent: () => {},
    debugLogIRs: (value: CompilerPipelineValue) => {
      // `InferTypes` is the earliest stage with full type info, and it is logged
      // *before* the compiler's own validation passes (which may throw, e.g. on a
      // Rules-of-Hooks violation) — so we still get the HIR to analyze.
      if (value.kind === 'hir' && value.name === 'InferTypes') {
        analyzedFunctions++;
        findings.push(...runChecks(value.value, CHECKS));
      }
    },
  };
  const pluginOptions: PluginOptions = {...config, logger};

  try {
    transformFromAstSync(ast, code, {
      filename: `/${filename}`,
      plugins: [[BabelPluginReactCompiler, pluginOptions]],
      sourceType: 'module',
      configFile: false,
      babelrc: false,
      ast: false,
    });
  } catch {
    // The compiler may bail (e.g. a Rules-of-Hooks error) after we've already
    // captured the HIR. We rely only on what was captured before the failure;
    // if nothing was captured the aggregate verdict is `unknown`.
  }

  return {
    verdict: aggregateVerdict(findings),
    analyzedFunctions,
    findings,
  };
}
