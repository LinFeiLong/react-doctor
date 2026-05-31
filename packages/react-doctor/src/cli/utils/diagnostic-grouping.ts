import { buildRulePromptUrl } from "@react-doctor/core";
import type { Diagnostic, ScoreResult } from "@react-doctor/core";

// Ordering / formatting helpers shared by the diagnostics renderer, the
// agent-handoff payload builder, and the on-disk diagnostics writer — so
// every surface ranks and references rules the same way without one
// reaching into the renderer for them.

export const SEVERITY_ORDER: Record<Diagnostic["severity"], number> = {
  error: 0,
  warning: 1,
};

// Build a `<plugin>/<rule>` -> priority lookup from the score API's per-rule
// payload (merged across scans). Rules the API didn't rank — or every rule
// when the score is unavailable — are simply absent and fall back to the
// severity + stakes ordering below.
export const buildRulePriorityMap = (
  scores: ReadonlyArray<ScoreResult | null>,
): ReadonlyMap<string, number> => {
  const rulePriority = new Map<string, number>();
  for (const score of scores) {
    if (!score?.rules) continue;
    for (const [ruleKey, info] of Object.entries(score.rules)) {
      if (typeof info.priority === "number") rulePriority.set(ruleKey, info.priority);
    }
  }
  return rulePriority;
};

// Effective sort weight for a rule group: its API-returned priority, or a
// severity-based midpoint when the rule isn't ranked (or the score is
// offline). With no priorities at all this degrades to error-before-warning
// (error 55 sorts ahead of warning 35), so offline ordering falls through to
// the severity + stakes tiebreakers below.
export const effectivePriority = (
  ruleKey: string,
  diagnostics: Diagnostic[],
  rulePriority: ReadonlyMap<string, number> | undefined,
): number => {
  const known = rulePriority?.get(ruleKey);
  if (known !== undefined) return known;
  return diagnostics[0].severity === "error" ? 55 : 35;
};

// Stakes ordering for surfacing diagnostics: the buckets developers
// react to most — a breach, a slow app, a crash — float to the top;
// maintainability (taste / structure) sinks. Lower rank = higher stakes
// = shown first. Any unrecognized category falls in the middle "likely
// bug" tier so it's never buried under maintainability notes.
const CATEGORY_STAKES_RANK = new Map<string, number>([
  ["Security", 0],
  ["Performance", 1],
  ["Bugs", 2],
  ["Accessibility", 3],
  ["Maintainability", 4],
]);
const DEFAULT_CATEGORY_STAKES_RANK = 2;

export const getCategoryStakesRank = (category: string): number =>
  CATEGORY_STAKES_RANK.get(category) ?? DEFAULT_CATEGORY_STAKES_RANK;

// The score API's per-rule priority leads (most-valuable-first); ties — and
// every group when offline — fall through to errors-above-warnings, then
// higher-stakes categories, then the rules that fire most often. Offline,
// `effectivePriority` collapses to a severity midpoint so this reduces to the
// branch's severity + stakes ordering with no regression.
export const sortRuleGroupsByImportance = (
  diagnosticGroups: [string, Diagnostic[]][],
  rulePriority?: ReadonlyMap<string, number>,
): [string, Diagnostic[]][] =>
  diagnosticGroups.toSorted(([ruleKeyA, diagnosticsA], [ruleKeyB, diagnosticsB]) => {
    const priorityDelta =
      effectivePriority(ruleKeyB, diagnosticsB, rulePriority) -
      effectivePriority(ruleKeyA, diagnosticsA, rulePriority);
    if (priorityDelta !== 0) return priorityDelta;
    const severityDelta =
      SEVERITY_ORDER[diagnosticsA[0].severity] - SEVERITY_ORDER[diagnosticsB[0].severity];
    if (severityDelta !== 0) return severityDelta;
    const stakesDelta =
      getCategoryStakesRank(diagnosticsA[0].category) -
      getCategoryStakesRank(diagnosticsB[0].category);
    if (stakesDelta !== 0) return stakesDelta;
    return diagnosticsB.length - diagnosticsA.length;
  });

// Directive (not a bare label) so the consuming agent treats the URL as
// a step to perform — fetch the canonical, reviewer-tested recipe and
// apply it — rather than as optional reference docs it can skip.
const FETCH_FIX_RECIPE_LABEL = "Fetch & follow the canonical fix recipe before fixing";

export const formatFixRecipeLine = (diagnostic: Diagnostic): string =>
  `${FETCH_FIX_RECIPE_LABEL}: ${buildRulePromptUrl(diagnostic.plugin, diagnostic.rule)}`;
