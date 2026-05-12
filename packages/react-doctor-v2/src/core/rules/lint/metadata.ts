import reactDoctorOxlintPlugin from "./plugin.js";
import { REACT_DOCTOR_CUSTOM_OXLINT_RULES } from "./presets.js";
import type { OxlintRuleSeverityMap } from "./presets.js";
import type { ReactDoctorRuleMetadata } from "../types.js";

export interface OxlintRuleMetadata extends ReactDoctorRuleMetadata {
  oxlintRuleName: string;
  oxlintRuleKey: string;
}

export const REACT_DOCTOR_OXLINT_PLUGIN_NAMESPACE = "react-doctor";
export const REACT_DOCTOR_OXLINT_RULE_ID_PREFIX = "oxlint/react-doctor/";

const toTitleCaseWord = (word: string): string => {
  const [firstLetter, ...remainingLetters] = word;
  if (firstLetter === undefined) return word;
  return `${firstLetter.toUpperCase()}${remainingLetters.join("")}`;
};

const toRuleDisplayName = (ruleName: string): string =>
  ruleName.split("-").map(toTitleCaseWord).join(" ");

const toReactDoctorSeverity = (
  severity: OxlintRuleSeverityMap[string],
): ReactDoctorRuleMetadata["severity"] => {
  if (severity === "error") return "error";
  if (severity === "off") return "info";
  return "warning";
};

export const reactDoctorOxlintRuleMetadata: OxlintRuleMetadata[] = Object.keys(
  reactDoctorOxlintPlugin.rules,
)
  .sort()
  .map((ruleName) => {
    const rule = reactDoctorOxlintPlugin.rules[ruleName];
    const oxlintRuleKey = `${REACT_DOCTOR_OXLINT_PLUGIN_NAMESPACE}/${ruleName}`;
    const severity = REACT_DOCTOR_CUSTOM_OXLINT_RULES[oxlintRuleKey] ?? "warn";

    return {
      id: `${REACT_DOCTOR_OXLINT_RULE_ID_PREFIX}${ruleName}`,
      name: toRuleDisplayName(ruleName),
      description: `Runs the ${oxlintRuleKey} custom oxlint rule.`,
      recommendation: rule.recommendation,
      examples: rule.examples,
      category: "oxlint",
      severity: toReactDoctorSeverity(severity),
      defaultEnabled: false,
      tags: ["oxlint", "custom", REACT_DOCTOR_OXLINT_PLUGIN_NAMESPACE],
      oxlintRuleName: ruleName,
      oxlintRuleKey,
    };
  });
