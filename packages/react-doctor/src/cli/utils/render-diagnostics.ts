import isUnicodeSupported from "is-unicode-supported";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import {
  buildRulePromptUrl,
  groupBy,
  highlighter,
  MILLISECONDS_PER_SECOND,
  OUTPUT_MEASURE_WIDTH_CHARS,
  RULE_NAME_COLUMN_WIDTH_CHARS,
  TOP_ERRORS_DISPLAY_COUNT,
} from "@react-doctor/core";
import type { Diagnostic } from "@react-doctor/core";
import { buildCodeFrame } from "./build-code-frame.js";
import { indentMultilineText } from "./indent-multiline-text.js";
import { wrapTextToWidth } from "./wrap-indented-text.js";

const POINTER = isUnicodeSupported() ? "›" : ">";

const SEVERITY_ORDER: Record<Diagnostic["severity"], number> = {
  error: 0,
  warning: 1,
};

// Stakes ordering for surfacing diagnostics: the categories developers
// react to most — a breach, a slow app, a crash — float to the top;
// taste (architecture / design) sinks. Lower rank = higher stakes =
// shown first. Categories not listed (framework buckets like Next.js /
// React Native / Server, or adopted-rule "Other") fall in the
// middle "likely bug" tier so they're never buried under style notes.
const CATEGORY_STAKES_RANK = new Map<string, number>([
  ["Security", 0],
  ["Performance", 1],
  ["Bugs", 2],
  ["Accessibility", 3],
  ["Maintainability", 4],
]);
const DEFAULT_CATEGORY_STAKES_RANK = 2;

const getCategoryStakesRank = (category: string): number =>
  CATEGORY_STAKES_RANK.get(category) ?? DEFAULT_CATEGORY_STAKES_RANK;

const colorizeBySeverity = (text: string, severity: Diagnostic["severity"]): string =>
  severity === "error" ? highlighter.error(text) : highlighter.warn(text);

// Errors always rank above warnings; within a severity, higher-stakes
// categories come first, then the rules that fire most often.
const sortByImportance = (diagnosticGroups: [string, Diagnostic[]][]): [string, Diagnostic[]][] =>
  diagnosticGroups.toSorted(([, diagnosticsA], [, diagnosticsB]) => {
    const severityDelta =
      SEVERITY_ORDER[diagnosticsA[0].severity] - SEVERITY_ORDER[diagnosticsB[0].severity];
    if (severityDelta !== 0) return severityDelta;
    const stakesDelta =
      getCategoryStakesRank(diagnosticsA[0].category) -
      getCategoryStakesRank(diagnosticsB[0].category);
    if (stakesDelta !== 0) return stakesDelta;
    return diagnosticsB.length - diagnosticsA.length;
  });

export const collectAffectedFiles = (diagnostics: Diagnostic[]): Set<string> =>
  new Set(diagnostics.map((diagnostic) => diagnostic.filePath));

interface VerboseSiteEntry {
  line: number;
  suppressionHint?: string;
}

interface CategoryDiagnosticGroup {
  category: string;
  diagnostics: Diagnostic[];
  ruleGroups: [string, Diagnostic[]][];
}

// Resolves the absolute project root a given diagnostic's relative
// `filePath` should be read from when building its inline code frame.
type SourceRootResolver = (diagnostic: Diagnostic) => string;

const buildVerboseSiteMap = (diagnostics: Diagnostic[]): Map<string, VerboseSiteEntry[]> => {
  const fileSites = new Map<string, VerboseSiteEntry[]>();
  for (const diagnostic of diagnostics) {
    const sites = fileSites.get(diagnostic.filePath) ?? [];
    if (diagnostic.line > 0) {
      sites.push({ line: diagnostic.line, suppressionHint: diagnostic.suppressionHint });
    }
    fileSites.set(diagnostic.filePath, sites);
  }
  return fileSites;
};

const formatSiteCountBadge = (count: number): string => (count > 1 ? `×${count}` : "");

const computeRuleNameColumnWidth = (ruleKeys: string[]): number => {
  const longestRuleNameLength = ruleKeys.reduce(
    (longest, ruleKey) => Math.max(longest, ruleKey.length),
    0,
  );
  return Math.max(RULE_NAME_COLUMN_WIDTH_CHARS, longestRuleNameLength);
};

const padRuleNameToColumn = (ruleName: string, columnWidth: number): string => {
  if (ruleName.length >= columnWidth) return ruleName;
  return ruleName + " ".repeat(columnWidth - ruleName.length);
};

const grayLine = (text: string): string => highlighter.gray(text);

// Directive (not a bare label) so the consuming agent treats the URL as
// a step to perform — fetch the canonical, reviewer-tested recipe and
// apply it — rather than as optional reference docs it can skip.
const FETCH_FIX_RECIPE_LABEL = "Fetch & follow the canonical fix recipe before fixing";

export const formatFixRecipeLine = (diagnostic: Diagnostic): string =>
  `${FETCH_FIX_RECIPE_LABEL}: ${buildRulePromptUrl(diagnostic.plugin, diagnostic.rule)}`;

const buildCompactRuleGroupLine = (
  ruleKey: string,
  ruleDiagnostics: Diagnostic[],
  ruleNameColumnWidth: number,
): string => {
  const firstDiagnostic = ruleDiagnostics[0];
  const severitySymbol = firstDiagnostic.severity === "error" ? "✗" : "⚠";
  const icon = colorizeBySeverity(severitySymbol, firstDiagnostic.severity);
  const siteCountBadge = formatSiteCountBadge(ruleDiagnostics.length);
  const ruleNameRendering =
    siteCountBadge.length > 0
      ? colorizeBySeverity(
          padRuleNameToColumn(ruleKey, ruleNameColumnWidth),
          firstDiagnostic.severity,
        )
      : colorizeBySeverity(ruleKey, firstDiagnostic.severity);
  const trailingBadge = siteCountBadge.length > 0 ? ` ${highlighter.gray(siteCountBadge)}` : "";
  return `  ${icon} ${ruleNameRendering}${trailingBadge}`;
};

const getWorstSeverity = (diagnostics: Diagnostic[]): Diagnostic["severity"] =>
  diagnostics.some((diagnostic) => diagnostic.severity === "error") ? "error" : "warning";

const buildCategoryDiagnosticGroups = (diagnostics: Diagnostic[]): CategoryDiagnosticGroup[] => {
  const categoryGroups = groupBy(diagnostics, (diagnostic) => diagnostic.category);
  return [...categoryGroups.entries()]
    .map(([category, categoryDiagnostics]) => {
      const ruleGroups = groupBy(
        categoryDiagnostics,
        (diagnostic) => `${diagnostic.plugin}/${diagnostic.rule}`,
      );
      return {
        category,
        diagnostics: categoryDiagnostics,
        ruleGroups: sortByImportance([...ruleGroups.entries()]),
      };
    })
    .toSorted((categoryGroupA, categoryGroupB) => {
      const severityDelta =
        SEVERITY_ORDER[getWorstSeverity(categoryGroupA.diagnostics)] -
        SEVERITY_ORDER[getWorstSeverity(categoryGroupB.diagnostics)];
      if (severityDelta !== 0) return severityDelta;
      const stakesDelta =
        getCategoryStakesRank(categoryGroupA.category) -
        getCategoryStakesRank(categoryGroupB.category);
      if (stakesDelta !== 0) return stakesDelta;
      if (categoryGroupA.diagnostics.length !== categoryGroupB.diagnostics.length) {
        return categoryGroupB.diagnostics.length - categoryGroupA.diagnostics.length;
      }
      return categoryGroupA.category.localeCompare(categoryGroupB.category);
    });
};

const buildCompactCategoryLine = (categoryGroup: CategoryDiagnosticGroup): string => {
  const errorCount = categoryGroup.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  ).length;
  const warningCount = categoryGroup.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning",
  ).length;
  const parts: string[] = [];
  if (errorCount > 0)
    parts.push(highlighter.error(`${errorCount} ${errorCount === 1 ? "error" : "errors"}`));
  if (warningCount > 0)
    parts.push(
      highlighter.warn(
        highlighter.dim(`${warningCount} ${warningCount === 1 ? "warning" : "warnings"}`),
      ),
    );
  return `  ${highlighter.bold(categoryGroup.category)} ${highlighter.dim(POINTER)} ${parts.join(highlighter.dim(", "))}`;
};

const buildVerboseRuleGroupLines = (
  ruleKey: string,
  ruleDiagnostics: Diagnostic[],
  ruleNameColumnWidth: number,
): ReadonlyArray<string> => {
  const lines: string[] = [];
  lines.push(buildCompactRuleGroupLine(ruleKey, ruleDiagnostics, ruleNameColumnWidth));
  const firstDiagnostic = ruleDiagnostics[0];
  lines.push(grayLine(indentMultilineText(firstDiagnostic.message, "      ")));
  if (firstDiagnostic.help) {
    lines.push(grayLine(indentMultilineText(`→ ${firstDiagnostic.help}`, "      ")));
  }
  lines.push(grayLine(`      ${formatFixRecipeLine(firstDiagnostic)}`));
  const fileSites = buildVerboseSiteMap(ruleDiagnostics);
  for (const [filePath, sites] of fileSites) {
    if (sites.length > 0) {
      for (const site of sites) {
        lines.push(grayLine(`      ${filePath}:${site.line}`));
        if (site.suppressionHint) {
          lines.push(grayLine(`        ↳ ${site.suppressionHint}`));
        }
      }
    } else {
      lines.push(grayLine(`      ${filePath}`));
    }
  }
  lines.push("");
  return lines;
};

const TOP_ERROR_DETAIL_INDENT = "    ";

const pickRepresentativeDiagnostic = (ruleDiagnostics: Diagnostic[]): Diagnostic =>
  ruleDiagnostics.find((diagnostic) => diagnostic.line > 0) ?? ruleDiagnostics[0];

const formatDiagnosticLocation = (diagnostic: Diagnostic): string =>
  diagnostic.line > 0 ? `${diagnostic.filePath}:${diagnostic.line}` : diagnostic.filePath;

const buildTopErrorBlock = (
  ruleKey: string,
  ruleDiagnostics: Diagnostic[],
  resolveSourceRoot: SourceRootResolver,
): ReadonlyArray<string> => {
  const representative = pickRepresentativeDiagnostic(ruleDiagnostics);
  const siteCountBadge = formatSiteCountBadge(ruleDiagnostics.length);
  const trailingBadge = siteCountBadge.length > 0 ? ` ${highlighter.gray(siteCountBadge)}` : "";

  // Prefix the headline with the category (e.g. "Security: Use of
  // eval()") so it's immediately clear which kind of problem this is —
  // a vulnerability, a perf hit, a crash — without scanning down to the
  // category breakdown. Falls back to the `plugin/rule` id when a
  // diagnostic has no title (adopted third-party rules).
  const headline = highlighter.error(
    `${representative.category}: ${representative.title ?? ruleKey}`,
  );

  const lines: string[] = [`  ${highlighter.error("✗")} ${headline}${trailingBadge}`];

  for (const explanationLine of wrapTextToWidth(
    representative.message,
    OUTPUT_MEASURE_WIDTH_CHARS,
    {
      breakLongWords: false,
    },
  )) {
    lines.push(highlighter.gray(`${TOP_ERROR_DETAIL_INDENT}${explanationLine}`));
  }

  // File location sits on its own line directly above the code frame so
  // it's obvious which file the frame belongs to (far easier to read
  // than trailing it after a long rule name on the header line).
  lines.push("");
  lines.push(
    highlighter.gray(`${TOP_ERROR_DETAIL_INDENT}${formatDiagnosticLocation(representative)}`),
  );

  const codeFrame = buildCodeFrame({
    filePath: representative.filePath,
    line: representative.line,
    column: representative.column,
    rootDirectory: resolveSourceRoot(representative),
  });
  if (codeFrame) {
    lines.push(indentMultilineText(codeFrame, TOP_ERROR_DETAIL_INDENT));
  }

  return lines;
};

const buildTopErrorsLines = (
  diagnostics: Diagnostic[],
  resolveSourceRoot: SourceRootResolver,
): ReadonlyArray<string> => {
  const errorDiagnostics = diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (errorDiagnostics.length === 0) return [];

  const ruleGroups = groupBy(
    errorDiagnostics,
    (diagnostic) => `${diagnostic.plugin}/${diagnostic.rule}`,
  );
  const topRuleGroups = sortByImportance([...ruleGroups.entries()]).slice(
    0,
    TOP_ERRORS_DISPLAY_COUNT,
  );

  const lines: string[] = [
    `  ${highlighter.bold(`Top ${topRuleGroups.length} ${topRuleGroups.length === 1 ? "error" : "errors"} you should fix`)}`,
    "",
  ];
  for (const [ruleKey, ruleDiagnostics] of topRuleGroups) {
    lines.push(...buildTopErrorBlock(ruleKey, ruleDiagnostics, resolveSourceRoot));
    lines.push("");
  }
  return lines;
};

const buildDefaultDiagnosticsLines = (
  diagnostics: Diagnostic[],
  resolveSourceRoot: SourceRootResolver,
): ReadonlyArray<string> => {
  const categoryGroups = buildCategoryDiagnosticGroups(diagnostics);
  const lines: string[] = [...buildTopErrorsLines(diagnostics, resolveSourceRoot)];
  for (const categoryGroup of categoryGroups) {
    lines.push(buildCompactCategoryLine(categoryGroup));
  }
  lines.push("");
  return lines;
};

/**
 * Effect-typed diagnostics renderer. Internal helpers build the
 * line array purely; the IO happens once at the boundary with a
 * single Effect.forEach over Console.log so failures or fiber
 * interruption produce predictable partial output.
 */
export const printDiagnostics = (
  diagnostics: Diagnostic[],
  isVerbose: boolean,
  // The directory each diagnostic's relative `filePath` is resolved
  // against for the inline code frame. A bare string works for a
  // single-project scan; multi-project scans pass a resolver so each
  // diagnostic reads from its own project root (their relative paths
  // would otherwise miss against a single shared root → no frame).
  sourceRoot: string | SourceRootResolver,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const resolveSourceRoot: SourceRootResolver =
      typeof sourceRoot === "function" ? sourceRoot : () => sourceRoot;
    let lines: ReadonlyArray<string>;
    if (!isVerbose) {
      lines = buildDefaultDiagnosticsLines(diagnostics, resolveSourceRoot);
    } else {
      const ruleGroups = groupBy(
        diagnostics,
        (diagnostic) => `${diagnostic.plugin}/${diagnostic.rule}`,
      );
      const sortedRuleGroups = sortByImportance([...ruleGroups.entries()]);
      const ruleNameColumnWidth = computeRuleNameColumnWidth(
        sortedRuleGroups.map(([ruleKey]) => ruleKey),
      );
      lines = sortedRuleGroups.flatMap(([ruleKey, ruleDiagnostics]) =>
        buildVerboseRuleGroupLines(ruleKey, ruleDiagnostics, ruleNameColumnWidth),
      );
    }
    for (const line of lines) {
      yield* Console.log(line);
    }
  });

export const formatElapsedTime = (elapsedMilliseconds: number): string => {
  if (elapsedMilliseconds < MILLISECONDS_PER_SECOND) {
    return `${Math.round(elapsedMilliseconds)}ms`;
  }
  return `${(elapsedMilliseconds / MILLISECONDS_PER_SECOND).toFixed(1)}s`;
};

export const formatRuleSummary = (ruleKey: string, ruleDiagnostics: Diagnostic[]): string => {
  const firstDiagnostic = ruleDiagnostics[0];

  const sections = [
    `Rule: ${ruleKey}`,
    `Severity: ${firstDiagnostic.severity}`,
    `Category: ${firstDiagnostic.category}`,
    `Count: ${ruleDiagnostics.length}`,
    "",
    firstDiagnostic.message,
  ];

  if (firstDiagnostic.help) {
    sections.push("", `Suggestion: ${firstDiagnostic.help}`);
  }
  if (firstDiagnostic.url) {
    sections.push("", `Docs: ${firstDiagnostic.url}`);
  }
  sections.push("", formatFixRecipeLine(firstDiagnostic));

  sections.push("", "Files:");
  const fileSites = buildVerboseSiteMap(ruleDiagnostics);
  for (const [filePath, sites] of fileSites) {
    if (sites.length > 0) {
      for (const site of sites) {
        sections.push(`  ${filePath}:${site.line}`);
        if (site.suppressionHint) {
          sections.push(`    ${site.suppressionHint}`);
        }
      }
    } else {
      sections.push(`  ${filePath}`);
    }
  }

  return sections.join("\n") + "\n";
};

export const sortRuleGroupsByImportance = sortByImportance;
