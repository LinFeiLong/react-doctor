import { collectScoreDiagnostics } from "./issue-to-score-diagnostic.js";
import { calculateScore, getScoreLabel } from "./score.js";
import type {
  ReactDoctorIssue,
  ReactDoctorJsonReport,
  ReactDoctorJsonReportSummary,
  ReactDoctorResult,
  ReactDoctorScore,
} from "./types.js";

export const calculateReactDoctorScore = (issues: ReactDoctorIssue[]): ReactDoctorScore => {
  const value = calculateScore(collectScoreDiagnostics(issues));
  return { value, label: getScoreLabel(value) };
};

export const summarizeReactDoctorResult = (
  result: ReactDoctorResult,
): ReactDoctorJsonReportSummary => {
  const affectedFiles = new Set(
    result.issues.flatMap((issue) => (issue.location?.filePath ? [issue.location.filePath] : [])),
  );
  return {
    errorCount: result.issues.filter((issue) => issue.severity === "error").length,
    warningCount: result.issues.filter((issue) => issue.severity === "warning").length,
    affectedFileCount: affectedFiles.size,
    totalIssueCount: result.issues.length,
    score: result.score?.value ?? null,
    scoreLabel: result.score?.label ?? null,
  };
};

export const buildReactDoctorJsonReport = (result: ReactDoctorResult): ReactDoctorJsonReport => ({
  schemaVersion: 1,
  ok: result.status === "completed" && !result.issues.some((issue) => issue.severity === "error"),
  project: result.project,
  issues: result.issues,
  checks: result.checks,
  summary: summarizeReactDoctorResult(result),
  startedAt: result.startedAt,
  completedAt: result.completedAt,
  durationMilliseconds: result.durationMilliseconds,
});
