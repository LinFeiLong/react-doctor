import { buildRulePromptUrl } from "@react-doctor/core";
import type { Diagnostic } from "@react-doctor/core";

// Ordering / formatting helpers shared by the diagnostics renderer, the
// agent-handoff payload builder, and the on-disk diagnostics writer — so
// every surface ranks and references rules the same way without one
// reaching into the renderer for them.

export const SEVERITY_ORDER: Record<Diagnostic["severity"], number> = {
  error: 0,
  warning: 1,
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

// Errors always rank above warnings; within a severity, higher-stakes
// categories come first, then the rules that fire most often.
export const sortRuleGroupsByImportance = (
  diagnosticGroups: [string, Diagnostic[]][],
): [string, Diagnostic[]][] =>
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

// Directive (not a bare label) so the consuming agent treats the URL as
// a step to perform — fetch the canonical, reviewer-tested recipe and
// apply it — rather than as optional reference docs it can skip.
const FETCH_FIX_RECIPE_LABEL = "Fetch & follow the canonical fix recipe before fixing";

export const formatFixRecipeLine = (diagnostic: Diagnostic): string =>
  `${FETCH_FIX_RECIPE_LABEL}: ${buildRulePromptUrl(diagnostic.plugin, diagnostic.rule)}`;
