import {
  GLOBAL_REACT_DOCTOR_OXLINT_RULES,
  NEXTJS_OXLINT_RULES,
  REACT_NATIVE_OXLINT_RULES,
  TANSTACK_QUERY_OXLINT_RULES,
  TANSTACK_START_OXLINT_RULES,
  reactDoctorOxlintRuleMetadata,
  reactDoctorOxlintPlugin,
  type OxlintRuleSeverityMap,
} from "./core/rules/index.js";
import type { RuleContext, RuleVisitors } from "./core/rules/lint/utils/index.js";

interface EslintRuleDefinition {
  meta: {
    docs: {
      description: string;
      recommended: boolean;
    };
    type: "problem" | "suggestion";
  };
  create: (context: RuleContext) => RuleVisitors;
}

interface EslintPlugin {
  meta: {
    name: string;
    version: string;
  };
  rules: Record<string, EslintRuleDefinition>;
  configs: {
    recommended: EslintFlatConfig;
    next: EslintFlatConfig;
    "react-native": EslintFlatConfig;
    "tanstack-start": EslintFlatConfig;
    "tanstack-query": EslintFlatConfig;
    all: EslintFlatConfig;
  };
}

interface EslintFlatConfig {
  name: string;
  plugins: Record<string, EslintPlugin>;
  rules: OxlintRuleSeverityMap;
}

const PLUGIN_NAMESPACE = "react-doctor";

const rules: Record<string, EslintRuleDefinition> = {};

for (const metadata of reactDoctorOxlintRuleMetadata) {
  const rule = reactDoctorOxlintPlugin.rules[metadata.oxlintRuleName];
  if (!rule) continue;
  rules[metadata.oxlintRuleName] = {
    meta: {
      docs: {
        description: metadata.description,
        recommended: metadata.defaultEnabled,
      },
      type: metadata.severity === "error" ? "problem" : "suggestion",
    },
    create: rule.create,
  };
}

const buildFlatConfig = (configName: string, ruleSet: OxlintRuleSeverityMap): EslintFlatConfig => ({
  name: `${PLUGIN_NAMESPACE}/${configName}`,
  plugins: {},
  rules: { ...ruleSet },
});

const ALL_RULES_AT_RECOMMENDED_SEVERITY: OxlintRuleSeverityMap = {
  ...GLOBAL_REACT_DOCTOR_OXLINT_RULES,
  ...NEXTJS_OXLINT_RULES,
  ...REACT_NATIVE_OXLINT_RULES,
  ...TANSTACK_START_OXLINT_RULES,
  ...TANSTACK_QUERY_OXLINT_RULES,
};

export const reactDoctorEslintPlugin: EslintPlugin = {
  meta: { name: PLUGIN_NAMESPACE, version: process.env.VERSION ?? "0.0.0" },
  rules,
  configs: {
    recommended: buildFlatConfig("recommended", GLOBAL_REACT_DOCTOR_OXLINT_RULES),
    next: buildFlatConfig("next", NEXTJS_OXLINT_RULES),
    "react-native": buildFlatConfig("react-native", REACT_NATIVE_OXLINT_RULES),
    "tanstack-start": buildFlatConfig("tanstack-start", TANSTACK_START_OXLINT_RULES),
    "tanstack-query": buildFlatConfig("tanstack-query", TANSTACK_QUERY_OXLINT_RULES),
    all: buildFlatConfig("all", ALL_RULES_AT_RECOMMENDED_SEVERITY),
  },
};

for (const flatConfig of Object.values(reactDoctorEslintPlugin.configs)) {
  flatConfig.plugins[PLUGIN_NAMESPACE] = reactDoctorEslintPlugin;
}

export default reactDoctorEslintPlugin;
