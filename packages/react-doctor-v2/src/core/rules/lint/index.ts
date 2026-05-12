export { default as reactDoctorOxlintPlugin } from "./plugin.js";
export {
  BUILTIN_OXLINT_RULES,
  buildReactDoctorOxlintCapabilities,
  createReactDoctorOxlintConfig,
  reactPeerRangeMinMajor,
  shouldEnableReactDoctorOxlintRule,
} from "./config.js";
export type {
  ReactDoctorOxlintConfigOptions,
  ReactDoctorOxlintFramework,
  ReactDoctorOxlintGeneratedConfig,
  ReactDoctorOxlintJsPluginEntry,
  ReactDoctorOxlintProjectInfo,
} from "./config.js";
export type {
  EsTreeNode as OxlintEsTreeNode,
  ParsedRgb as OxlintParsedRgb,
  Rule as OxlintRule,
  RuleContext as OxlintRuleContext,
  RuleExample as OxlintRuleExample,
  RulePlugin as OxlintRulePlugin,
  RuleVisitors as OxlintRuleVisitors,
} from "./utils.js";
export {
  REACT_DOCTOR_OXLINT_PLUGIN_NAMESPACE,
  REACT_DOCTOR_OXLINT_RULE_ID_PREFIX,
  reactDoctorOxlintRuleMetadata,
} from "./metadata.js";
export type { OxlintRuleMetadata } from "./metadata.js";
export {
  ALL_REACT_DOCTOR_OXLINT_RULE_KEYS,
  BUILTIN_A11Y_OXLINT_RULES,
  BUILTIN_REACT_OXLINT_RULES,
  CURATED_OXLINT_RULES,
  GLOBAL_REACT_DOCTOR_OXLINT_RULES,
  NEXTJS_OXLINT_RULES,
  REACT_COMPILER_OXLINT_RULES,
  REACT_DOCTOR_CUSTOM_OXLINT_RULES,
  REACT_NATIVE_OXLINT_RULES,
  TANSTACK_QUERY_OXLINT_RULES,
  TANSTACK_START_OXLINT_RULES,
} from "./presets.js";
export type { OxlintRuleSeverityMap } from "./presets.js";
