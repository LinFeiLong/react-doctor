import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync } from "oxc-parser";
import { ReactDoctorCheckFailedError, ReactDoctorRunnerUnavailableError } from "../errors.js";
import { createReactDoctorOxlintConfig, reactDoctorOxlintRuleMetadata } from "../rules/index.js";
import { collectPatternNames, isNodeOfType, walkAst } from "../rules/lint/utils/index.js";
import type { EsTreeNode } from "../rules/lint/utils/index.js";
import type { ReactDoctorOxlintProjectInfo } from "../rules/index.js";
import type { ReactDoctorIssue } from "../types.js";
import { OXLINT_CHECK_ID } from "./check-ids.js";
import { collectIgnorePatterns } from "./collect-ignore-patterns.js";

export { OXLINT_CHECK_ID };

export interface OxlintSpan {
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

interface OxlintLabel {
  span?: OxlintSpan;
}

interface OxlintDiagnostic {
  code?: string;
  message?: string;
  severity?: string;
  help?: string;
  url?: string;
  filename?: string;
  labels?: OxlintLabel[];
}

interface OxlintOutput {
  diagnostics?: OxlintDiagnostic[];
}

interface SourceRange {
  start: number;
  end: number;
}

export interface RunOxlintOptions {
  rootDirectory: string;
  includePaths?: string[];
  excludePatterns?: string[];
  project: ReactDoctorOxlintProjectInfo;
  customRulesOnly?: boolean;
  includeEcosystemRules?: boolean;
  adoptExistingLintConfig?: boolean;
  ignoredTags?: ReadonlySet<string>;
  signal?: AbortSignal;
}

const esmRequire = createRequire(import.meta.url);
const OXLINT_STDERR_PREVIEW_LENGTH = 2_000;
const REACT_RULES_OF_HOOKS_CODE = "react/rules-of-hooks";
const REACT_USE_HOOK_MESSAGE_FRAGMENT = 'React Hook "use"';
const USE_IDENTIFIER_NAME = "use";
const USER_LINT_CONFIG_FILENAMES = [".oxlintrc.json", ".eslintrc.json"];
const TSCONFIG_FILENAMES = ["tsconfig.json", "tsconfig.base.json"];

const resolveTsconfigRelativePath = (rootDirectory: string): string | null => {
  for (const fileName of TSCONFIG_FILENAMES) {
    if (existsSync(path.join(rootDirectory, fileName))) return `./${fileName}`;
  }
  return null;
};

const metadataByRuleKey = new Map(
  reactDoctorOxlintRuleMetadata.map((metadata) => [metadata.oxlintRuleKey, metadata]),
);

const PLUGIN_CATEGORY_MAP: Record<string, string> = {
  react: "Correctness",
  "react-hooks": "Correctness",
  "react-hooks-js": "React Compiler",
  "react-doctor": "Other",
  "jsx-a11y": "Accessibility",
  knip: "Dead Code",
  effect: "State & Effects",
  eslint: "Correctness",
  oxc: "Correctness",
  typescript: "Correctness",
  unicorn: "Correctness",
  import: "Bundle Size",
  promise: "Correctness",
  n: "Correctness",
  node: "Correctness",
  vitest: "Correctness",
  jest: "Correctness",
  nextjs: "Next.js",
};

const RULE_CATEGORY_MAP: Record<string, string> = {
  "react-doctor/no-derived-state-effect": "State & Effects",
  "react-doctor/no-fetch-in-effect": "State & Effects",
  "react-doctor/no-mirror-prop-effect": "State & Effects",
  "react-doctor/no-mutable-in-deps": "State & Effects",
  "react-doctor/no-cascading-set-state": "State & Effects",
  "react-doctor/no-effect-chain": "State & Effects",
  "react-doctor/no-effect-event-handler": "State & Effects",
  "react-doctor/no-effect-event-in-deps": "State & Effects",
  "react-doctor/no-event-trigger-state": "State & Effects",
  "react-doctor/no-prop-callback-in-effect": "State & Effects",
  "react-doctor/no-derived-useState": "State & Effects",
  "react-doctor/no-direct-state-mutation": "State & Effects",
  "react-doctor/no-set-state-in-render": "State & Effects",
  "react-doctor/prefer-use-effect-event": "State & Effects",
  "react-doctor/prefer-useReducer": "State & Effects",
  "react-doctor/prefer-use-sync-external-store": "State & Effects",
  "react-doctor/rerender-lazy-state-init": "Performance",
  "react-doctor/rerender-functional-setstate": "Performance",
  "react-doctor/rerender-dependencies": "State & Effects",
  "react-doctor/rerender-state-only-in-handlers": "Performance",
  "react-doctor/rerender-defer-reads-hook": "Performance",
  "react-doctor/advanced-event-handler-refs": "Performance",
  "react-doctor/effect-needs-cleanup": "State & Effects",
  "react-doctor/no-generic-handler-names": "Architecture",
  "react-doctor/no-giant-component": "Architecture",
  "react-doctor/no-many-boolean-props": "Architecture",
  "react-doctor/no-react19-deprecated-apis": "Architecture",
  "react-doctor/no-render-prop-children": "Architecture",
  "react-doctor/no-render-in-render": "Architecture",
  "react-doctor/no-nested-component-definition": "Correctness",
  "react-doctor/react-compiler-destructure-method": "Architecture",
  "react-doctor/no-legacy-class-lifecycles": "Correctness",
  "react-doctor/no-legacy-context-api": "Correctness",
  "react-doctor/no-default-props": "Architecture",
  "react-doctor/no-react-dom-deprecated-apis": "Architecture",
  "react-doctor/no-usememo-simple-expression": "Performance",
  "react-doctor/no-layout-property-animation": "Performance",
  "react-doctor/rerender-memo-with-default-value": "Performance",
  "react-doctor/rerender-memo-before-early-return": "Performance",
  "react-doctor/rerender-transitions-scroll": "Performance",
  "react-doctor/rerender-derived-state-from-hook": "Performance",
  "react-doctor/async-defer-await": "Performance",
  "react-doctor/async-await-in-loop": "Performance",
  "react-doctor/rendering-animate-svg-wrapper": "Performance",
  "react-doctor/rendering-hoist-jsx": "Performance",
  "react-doctor/rendering-hydration-mismatch-time": "Correctness",
  "react-doctor/rendering-usetransition-loading": "Performance",
  "react-doctor/rendering-hydration-no-flicker": "Performance",
  "react-doctor/rendering-script-defer-async": "Performance",
  "react-doctor/no-inline-prop-on-memo-component": "Performance",
  "react-doctor/no-transition-all": "Performance",
  "react-doctor/no-global-css-variable-animation": "Performance",
  "react-doctor/no-large-animated-blur": "Performance",
  "react-doctor/no-scale-from-zero": "Performance",
  "react-doctor/no-permanent-will-change": "Performance",
  "react-doctor/no-secrets-in-client-code": "Security",
  "react-doctor/no-barrel-import": "Bundle Size",
  "react-doctor/no-dynamic-import-path": "Bundle Size",
  "react-doctor/no-full-lodash-import": "Bundle Size",
  "react-doctor/no-moment": "Bundle Size",
  "react-doctor/prefer-dynamic-import": "Bundle Size",
  "react-doctor/use-lazy-motion": "Bundle Size",
  "react-doctor/no-undeferred-third-party": "Bundle Size",
  "react-doctor/no-array-index-as-key": "Correctness",
  "react-doctor/no-polymorphic-children": "Architecture",
  "react-doctor/rendering-conditional-render": "Correctness",
  "react-doctor/rendering-svg-precision": "Performance",
  "react-doctor/no-prevent-default": "Correctness",
  "react-doctor/no-uncontrolled-input": "Correctness",
  "react-doctor/no-document-start-view-transition": "Correctness",
  "react-doctor/no-flush-sync": "Performance",
  "react-doctor/no-justified-text": "Accessibility",
  "react-doctor/no-tiny-text": "Accessibility",
  "react-doctor/no-gray-on-colored-background": "Accessibility",
  "react-doctor/no-disabled-zoom": "Accessibility",
  "react-doctor/no-outline-none": "Accessibility",
  "react-doctor/design-no-vague-button-label": "Accessibility",
  "react-doctor/no-inline-bounce-easing": "Performance",
  "react-doctor/no-z-index-9999": "Architecture",
  "react-doctor/no-inline-exhaustive-style": "Architecture",
  "react-doctor/no-side-tab-border": "Architecture",
  "react-doctor/no-pure-black-background": "Architecture",
  "react-doctor/no-gradient-text": "Architecture",
  "react-doctor/no-dark-mode-glow": "Architecture",
  "react-doctor/no-wide-letter-spacing": "Architecture",
  "react-doctor/no-layout-transition-inline": "Performance",
  "react-doctor/no-long-transition-duration": "Performance",
  "react-doctor/design-no-bold-heading": "Architecture",
  "react-doctor/design-no-redundant-padding-axes": "Architecture",
  "react-doctor/design-no-redundant-size-axes": "Architecture",
  "react-doctor/design-no-space-on-flex-children": "Architecture",
  "react-doctor/design-no-three-period-ellipsis": "Architecture",
  "react-doctor/design-no-default-tailwind-palette": "Architecture",
  "react-doctor/js-flatmap-filter": "Performance",
  "react-doctor/js-combine-iterations": "Performance",
  "react-doctor/js-tosorted-immutable": "Performance",
  "react-doctor/js-hoist-regexp": "Performance",
  "react-doctor/js-hoist-intl": "Performance",
  "react-doctor/js-cache-property-access": "Performance",
  "react-doctor/js-length-check-first": "Performance",
  "react-doctor/js-min-max-loop": "Performance",
  "react-doctor/js-set-map-lookups": "Performance",
  "react-doctor/js-batch-dom-css": "Performance",
  "react-doctor/js-index-maps": "Performance",
  "react-doctor/js-cache-storage": "Performance",
  "react-doctor/js-early-exit": "Performance",
  "react-doctor/no-eval": "Security",
  "react-doctor/async-parallel": "Performance",
  "react-doctor/client-passive-event-listeners": "Performance",
  "react-doctor/client-localstorage-no-version": "Correctness",
  "react-doctor/query-stable-query-client": "TanStack Query",
  "react-doctor/query-no-rest-destructuring": "TanStack Query",
  "react-doctor/query-no-void-query-fn": "TanStack Query",
  "react-doctor/query-no-query-in-effect": "TanStack Query",
  "react-doctor/query-mutation-missing-invalidation": "TanStack Query",
  "react-doctor/query-no-usequery-for-mutation": "TanStack Query",
  "react-doctor/server-auth-actions": "Server",
  "react-doctor/server-after-nonblocking": "Server",
  "react-doctor/server-no-mutable-module-state": "Server",
  "react-doctor/server-cache-with-object-literal": "Server",
  "react-doctor/server-hoist-static-io": "Server",
  "react-doctor/server-dedup-props": "Server",
  "react-doctor/server-sequential-independent-await": "Server",
  "react-doctor/server-fetch-without-revalidate": "Server",
  "react-doctor/nextjs-no-side-effect-in-get-handler": "Security",
  "react-doctor/tanstack-start-no-secrets-in-loader": "Security",
  "react-doctor/tanstack-start-get-mutation": "Security",
  "react-doctor/tanstack-start-loader-parallel-fetch": "Performance",
};

const RULE_TITLE_WORD_UPPERCASE = /\b(css|html|url|svg|jsx|api|ua|rn)\b/gi;

const toRuleTitle = (ruleName: string): string => {
  const readable = ruleName
    .replace(/^(no|prefer|require|use)-/, "")
    .replace(/^(nextjs|tanstack-start|tanstack-query|rn|js|server|client|query|effect|design|rendering|rerender|react-compiler|advanced)-/, "")
    .replaceAll("-", " ");
  const titled = readable.charAt(0).toUpperCase() + readable.slice(1);
  return titled.replace(RULE_TITLE_WORD_UPPERCASE, (match) => match.toUpperCase());
};

const resolveCategoryForCode = (
  code: string,
  pluginName: string,
  ruleId: string,
): string => {
  const normalized = `${pluginName}/${ruleId}`;
  const fromRule = RULE_CATEGORY_MAP[normalized] ?? RULE_CATEGORY_MAP[code];
  if (fromRule) return fromRule;
  const fromPlugin = PLUGIN_CATEGORY_MAP[pluginName];
  if (fromPlugin) return fromPlugin;
  return "Other";
};

const cleanDiagnosticMessage = (raw: string | undefined): string => {
  if (!raw) return "";
  const trimmed = raw.trim();
  const firstParagraph = trimmed.split(/\n\s*\n/, 1)[0] ?? trimmed;
  return firstParagraph.split("\n")[0]?.trim() ?? "";
};

const cleanDiagnosticHelp = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  const firstParagraph = trimmed.split(/\n\s*\n/, 1)[0] ?? trimmed;
  return firstParagraph.replace(/\s+/g, " ").trim();
};

const resolveOxlintBinary = (): string => {
  try {
    const packageJsonPath = esmRequire.resolve("oxlint/package.json");
    return path.join(path.dirname(packageJsonPath), "bin/oxlint");
  } catch (error) {
    throw new ReactDoctorRunnerUnavailableError(
      OXLINT_CHECK_ID,
      "Oxlint is not installed. Add oxlint to the project or install react-doctor dependencies.",
      { cause: error },
    );
  }
};

const resolvePluginPath = (): string => {
  const candidatePaths = [
    fileURLToPath(new URL("./oxlint-plugin.js", import.meta.url)),
    fileURLToPath(new URL("../../oxlint-plugin.js", import.meta.url)),
  ];
  return candidatePaths.find((candidatePath) => existsSync(candidatePath)) ?? candidatePaths[0];
};

const detectUserLintConfigPaths = (rootDirectory: string): string[] => {
  let currentDirectory = rootDirectory;

  while (true) {
    for (const fileName of USER_LINT_CONFIG_FILENAMES) {
      const configPath = path.join(currentDirectory, fileName);
      if (existsSync(configPath)) return [configPath];
    }
    if (existsSync(path.join(currentDirectory, ".git"))) return [];

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) return [];
    currentDirectory = parentDirectory;
  }
};

const splitRuleCode = (code: string): { pluginName: string; ruleId: string } => {
  const parenMatch = code.match(/^([^(]+)\(([^)]+)\)$/);
  if (parenMatch) {
    return { pluginName: parenMatch[1], ruleId: parenMatch[2] };
  }
  const separatorIndex = code.indexOf("/");
  if (separatorIndex < 0) return { pluginName: "oxlint", ruleId: code };
  return {
    pluginName: code.slice(0, separatorIndex),
    ruleId: code.slice(separatorIndex + 1),
  };
};

const toRelativeFilename = (rootDirectory: string, filename: string | undefined): string => {
  if (!filename) return "";
  if (!path.isAbsolute(filename)) return filename;
  return path.relative(rootDirectory, filename);
};

const toReactDoctorIssue = (
  diagnostic: OxlintDiagnostic,
  rootDirectory: string,
): ReactDoctorIssue => {
  const code = diagnostic.code ?? "oxlint/unknown";
  const ruleSource = splitRuleCode(code);
  const normalizedCode = `${ruleSource.pluginName}/${ruleSource.ruleId}`;
  const metadata =
    metadataByRuleKey.get(code) ?? metadataByRuleKey.get(normalizedCode);
  const firstSpan = diagnostic.labels?.[0]?.span;
  const filePath = toRelativeFilename(rootDirectory, diagnostic.filename);
  const severity = diagnostic.severity === "error" ? "error" : "warning";

  const fallbackTitle = toRuleTitle(ruleSource.ruleId);
  const category = resolveCategoryForCode(code, ruleSource.pluginName, ruleSource.ruleId);

  return {
    id: `${OXLINT_CHECK_ID}/${code}/${filePath}/${firstSpan?.line ?? 0}/${firstSpan?.column ?? 0}`,
    title: metadata?.name ?? fallbackTitle,
    message: cleanDiagnosticMessage(diagnostic.message ?? code),
    severity,
    category,
    recommendation: metadata?.recommendation ?? cleanDiagnosticHelp(diagnostic.help),
    location: filePath
      ? {
          filePath,
          line: firstSpan?.line,
          column: firstSpan?.column,
          endLine: firstSpan?.endLine,
          endColumn: firstSpan?.endColumn,
        }
      : undefined,
    source: {
      checkId: OXLINT_CHECK_ID,
      pluginName: ruleSource.pluginName,
      ruleId: ruleSource.ruleId,
    },
  };
};

const isFunctionNode = (node: EsTreeNode): boolean =>
  isNodeOfType(node, "ArrowFunctionExpression") ||
  isNodeOfType(node, "FunctionDeclaration") ||
  isNodeOfType(node, "FunctionExpression");

const hasUseParameterInScope = (node: EsTreeNode): boolean => {
  let currentNode = node.parent;
  while (currentNode) {
    if (isFunctionNode(currentNode)) {
      const parameterNames = new Set<string>();
      for (const parameter of currentNode.params ?? []) {
        collectPatternNames(parameter, parameterNames);
      }
      if (parameterNames.has(USE_IDENTIFIER_NAME)) return true;
    }
    currentNode = currentNode.parent;
  }
  return false;
};

const getNodeRange = (node: EsTreeNode): SourceRange | null => {
  if (!Array.isArray(node.range)) return null;
  const [start, end] = node.range;
  if (typeof start !== "number" || typeof end !== "number") return null;
  return { start, end };
};

const toLineRange = (sourceText: string, line: number | undefined): SourceRange | null => {
  if (!line || line < 1) return null;
  let currentLine = 1;
  let lineStart = 0;
  for (let index = 0; index < sourceText.length; index += 1) {
    if (currentLine === line) {
      const newlineIndex = sourceText.indexOf("\n", index);
      return { start: lineStart, end: newlineIndex === -1 ? sourceText.length : newlineIndex };
    }
    if (sourceText[index] === "\n") {
      currentLine += 1;
      lineStart = index + 1;
    }
  }
  return currentLine === line ? { start: lineStart, end: sourceText.length } : null;
};

const rangesOverlap = (firstRange: SourceRange, secondRange: SourceRange): boolean =>
  firstRange.start <= secondRange.end && secondRange.start <= firstRange.end;

export const isLocalUseRulesOfHooksFalsePositive = (
  sourceText: string,
  filePath: string,
  span: OxlintSpan | undefined,
): boolean => {
  const lineRange = toLineRange(sourceText, span?.line);
  if (!lineRange) return false;

  try {
    const parseResult = parseSync(filePath, sourceText, {
      sourceType: "unambiguous",
      range: true,
    });
    let didFindLocalUseCall = false;
    walkAst(parseResult.program as EsTreeNode, (node) => {
      if (didFindLocalUseCall) return false;
      if (!isNodeOfType(node, "CallExpression")) return;
      if (!isNodeOfType(node.callee, "Identifier")) return;
      if (node.callee.name !== USE_IDENTIFIER_NAME) return;
      const callRange = getNodeRange(node);
      if (!callRange || !rangesOverlap(callRange, lineRange)) return;
      didFindLocalUseCall = hasUseParameterInScope(node);
      if (didFindLocalUseCall) return false;
    });
    return didFindLocalUseCall;
  } catch {
    return false;
  }
};

const shouldSuppressLocalUseRulesOfHooksDiagnostic = async (
  diagnostic: OxlintDiagnostic,
  rootDirectory: string,
): Promise<boolean> => {
  if (diagnostic.code !== REACT_RULES_OF_HOOKS_CODE) return false;
  if (!diagnostic.message?.includes(REACT_USE_HOOK_MESSAGE_FRAGMENT)) return false;
  const span = diagnostic.labels?.[0]?.span;
  const filename = diagnostic.filename;
  if (!filename || !span?.line) return false;

  const filePath = path.isAbsolute(filename) ? filename : path.join(rootDirectory, filename);
  try {
    const sourceText = await fs.readFile(filePath, "utf8");
    return isLocalUseRulesOfHooksFalsePositive(sourceText, filePath, span);
  } catch {
    return false;
  }
};

const filterOxlintDiagnostics = async (
  diagnostics: OxlintDiagnostic[],
  rootDirectory: string,
): Promise<OxlintDiagnostic[]> => {
  const filteredDiagnostics: OxlintDiagnostic[] = [];
  for (const diagnostic of diagnostics) {
    if (await shouldSuppressLocalUseRulesOfHooksDiagnostic(diagnostic, rootDirectory)) continue;
    filteredDiagnostics.push(diagnostic);
  }
  return filteredDiagnostics;
};

const formatOxlintOutputPreview = (stdout: string, stderr = ""): string => {
  const combinedOutput = [stdout, stderr].filter((value) => value.trim().length > 0).join("\n");
  return combinedOutput.trim().slice(0, OXLINT_STDERR_PREVIEW_LENGTH);
};

const parseOxlintOutput = (stdout: string, stderr = ""): OxlintDiagnostic[] => {
  if (!stdout.trim()) return [];
  let output: OxlintOutput;
  try {
    output = JSON.parse(stdout);
  } catch (error) {
    const preview = formatOxlintOutputPreview(stdout, stderr);
    throw new ReactDoctorCheckFailedError(
      OXLINT_CHECK_ID,
      preview ? `Oxlint failed before returning JSON: ${preview}` : "Oxlint returned invalid JSON.",
      {
        cause: error,
      },
    );
  }
  return output.diagnostics ?? [];
};

const spawnOxlint = (
  args: string[],
  rootDirectory: string,
  signal: AbortSignal | undefined,
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDirectory,
      signal,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode === 0 || exitCode === 1) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new ReactDoctorCheckFailedError(
          OXLINT_CHECK_ID,
          `Oxlint failed with exit code ${exitCode ?? "unknown"}: ${stderr.slice(0, OXLINT_STDERR_PREVIEW_LENGTH)}`,
        ),
      );
    });
  });

export const runOxlint = async (options: RunOxlintOptions): Promise<ReactDoctorIssue[]> => {
  options.signal?.throwIfAborted();
  const configDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "react-doctor-oxlint-"));
  const configPath = path.join(configDirectory, ".oxlintrc.json");
  const oxlintBinary = resolveOxlintBinary();
  const config = createReactDoctorOxlintConfig({
    pluginPath: resolvePluginPath(),
    projectRootDirectory: options.rootDirectory,
    project: options.project,
    customRulesOnly: options.customRulesOnly,
    includeEcosystemRules: options.includeEcosystemRules,
    extendsPaths:
      options.adoptExistingLintConfig === true && !options.customRulesOnly
        ? detectUserLintConfigPaths(options.rootDirectory)
        : [],
    ignoredTags: options.ignoredTags,
  });
  await fs.writeFile(configPath, JSON.stringify(config), { mode: 0o600 });

  try {
    const args = [
      oxlintBinary,
      "-c",
      configPath,
      "--format",
      "json",
      ...(options.excludePatterns ?? []).flatMap((pattern) => ["--ignore-pattern", pattern]),
    ];
    if (options.project.hasTypeScript) {
      const tsconfigRelativePath = resolveTsconfigRelativePath(options.rootDirectory);
      if (tsconfigRelativePath) args.push("--tsconfig", tsconfigRelativePath);
    }
    // HACK: oxlint reads `.eslintignore` automatically, but the moment we pass
    // `--ignore-path` it stops doing so — so `.eslintignore` patterns must be
    // included in the combined file too. Mirrors v1's `collectIgnorePatterns`,
    // which also pulls in `.prettierignore` and `.gitattributes` linguist
    // annotations so vendored/generated files (e.g. Monaco editor's bundled
    // tsWorker.js in supabase) don't get scanned and blow up wall-clock.
    const combinedPatterns = collectIgnorePatterns(options.rootDirectory);
    if (combinedPatterns.length > 0) {
      const combinedIgnorePath = path.join(configDirectory, "combined.ignore");
      await fs.writeFile(combinedIgnorePath, `${combinedPatterns.join("\n")}\n`);
      args.push("--ignore-path", combinedIgnorePath);
    }
    args.push(...(options.includePaths?.length ? options.includePaths : ["."]));
    const { stdout, stderr } = await spawnOxlint(args, options.rootDirectory, options.signal);
    const diagnostics = parseOxlintOutput(stdout, stderr);
    const filteredDiagnostics = await filterOxlintDiagnostics(diagnostics, options.rootDirectory);
    return filteredDiagnostics.map((diagnostic) =>
      toReactDoctorIssue(diagnostic, options.rootDirectory),
    );
  } finally {
    await fs.rm(configDirectory, { recursive: true, force: true });
  }
};
