/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * ---
 *
 * Tiny CLI scaffold for the verifier. Point it at a React file:
 *
 *   pnpm --filter babel-plugin-react-compiler verify ./path/to/Component.tsx
 *
 * Exit codes: 0 = verified (safe), 1 = not verified (findings), 2 = could not
 * analyze (no component found / parse error).
 */

import {readFileSync} from 'node:fs';
import {basename, resolve} from 'node:path';
import {Command} from 'commander';
import {verifySource} from './verify-source';
import type {Finding, VerifierReport} from './verdict';

interface CliOptions {
  json?: boolean;
}

const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const YELLOW = '\u001b[33m';
const DIM = '\u001b[2m';
const BOLD = '\u001b[1m';
const RESET = '\u001b[0m';

function printFinding(finding: Finding): void {
  const mark = finding.tier === 'proven' ? `${RED}✗${RESET}` : `${YELLOW}!${RESET}`;
  const where =
    finding.loc !== null ? `${DIM}(line ${finding.loc.line})${RESET}` : '';
  process.stdout.write(
    `\n  ${mark} ${BOLD}${finding.property}${RESET} ${DIM}[${finding.tier}]${RESET} ${where}\n`,
  );
  process.stdout.write(`    ${finding.reason}\n`);
  for (const line of finding.witness) {
    process.stdout.write(`    ${DIM}${line}${RESET}\n`);
  }
}

function printReport(file: string, report: VerifierReport): void {
  const name = basename(file);
  if (report.analyzedFunctions === 0) {
    process.stdout.write(
      `${YELLOW}? ${name}${RESET} — could not analyze (no component/hook found, or parse error)\n`,
    );
    return;
  }

  if (report.verdict === 'safe') {
    process.stdout.write(
      `${GREEN}${BOLD}✓ VERIFIED${RESET} ${name} ${DIM}— no issues proven across ${report.analyzedFunctions} function(s)${RESET}\n`,
    );
    return;
  }

  const label = report.verdict === 'violation' ? 'NOT VERIFIED' : 'UNVERIFIED';
  process.stdout.write(`${RED}${BOLD}✗ ${label}${RESET} ${name}\n`);
  for (const finding of report.findings) {
    printFinding(finding);
  }
  const proven = report.findings.filter((f) => f.tier === 'proven').length;
  const structural = report.findings.length - proven;
  process.stdout.write(
    `\n${DIM}${proven} proven, ${structural} structural across ${report.analyzedFunctions} function(s)${RESET}\n`,
  );
}

function main(): void {
  const program = new Command();
  program
    .name('react-compiler-verify')
    .description('Statically verify a React file for a set of failure classes')
    .argument('<file>', 'path to a React component/hook file')
    .option('--json', 'output the raw report as JSON')
    .action((file: string, options: CliOptions) => {
      const absolutePath = resolve(process.cwd(), file);
      let code: string;
      try {
        code = readFileSync(absolutePath, 'utf8');
      } catch {
        process.stderr.write(`${RED}error${RESET} cannot read file: ${file}\n`);
        process.exit(2);
      }

      const report = verifySource(code, {filename: basename(absolutePath)});

      if (options.json === true) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        printReport(absolutePath, report);
      }

      if (report.analyzedFunctions === 0) {
        process.exit(2);
      }
      process.exit(report.verdict === 'safe' ? 0 : 1);
    });

  program.parse();
}

main();
