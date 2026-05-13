import { OXLINT_CHECK_ID } from "./runners/check-ids.js";
import type { ReactDoctorIssue } from "./types.js";

// Custom checks (dead-code, react-architecture, dependencies, ...) emit many
// fine-grained sub-rule IDs from a single rule definition for display clarity.
// Score them as ONE rule keyed by checkId so the scoring formula doesn't
// multiply the same underlying check 7-16x. Oxlint emits all diagnostics under
// one checkId with the real rule in source.ruleId, so it must continue to
// score per-ruleId.
const REACT_DOCTOR_CHECK_PREFIX = "react-doctor/";

const isCustomCheckId = (checkId: string | undefined): checkId is string =>
  typeof checkId === "string" &&
  checkId.startsWith(REACT_DOCTOR_CHECK_PREFIX) &&
  checkId !== OXLINT_CHECK_ID;

export const getScoringRuleKey = (issue: ReactDoctorIssue): string => {
  const checkId = issue.source?.checkId;
  return isCustomCheckId(checkId) ? checkId : (issue.source?.ruleId ?? issue.id);
};

export const getScoringPluginKey = (issue: ReactDoctorIssue): string =>
  issue.source?.pluginName ?? "react-doctor";
