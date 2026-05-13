import type { ScoreDiagnostic } from "./score.js";
import { getScoringPluginKey, getScoringRuleKey } from "./scoring-key.js";
import type { ReactDoctorIssue } from "./types.js";

// Convert a `ReactDoctorIssue` to a `ScoreDiagnostic`, returning `null`
// for info-severity issues so they don't contribute to scoring. Shared
// between local scoring (`reports.ts`), the verbose CLI breakdown, and
// the remote scoring path so the three never drift.
export const issueToScoreDiagnostic = (issue: ReactDoctorIssue): ScoreDiagnostic | null => {
  if (issue.severity === "info") return null;
  return {
    plugin: getScoringPluginKey(issue),
    rule: getScoringRuleKey(issue),
    category: issue.category,
    severity: issue.severity === "error" ? "error" : "warning",
  };
};

export const collectScoreDiagnostics = (issues: ReactDoctorIssue[]): ScoreDiagnostic[] => {
  const scoringDiagnostics: ScoreDiagnostic[] = [];
  for (const issue of issues) {
    const diagnostic = issueToScoreDiagnostic(issue);
    if (diagnostic) scoringDiagnostics.push(diagnostic);
  }
  return scoringDiagnostics;
};
