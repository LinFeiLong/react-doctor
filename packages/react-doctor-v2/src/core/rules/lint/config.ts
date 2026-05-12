import { createRequire } from "node:module";
import {
  BUILTIN_A11Y_OXLINT_RULES,
  BUILTIN_REACT_OXLINT_RULES,
  ECOSYSTEM_OXLINT_RULES,
  GLOBAL_REACT_DOCTOR_OXLINT_RULES,
  NEXTJS_OXLINT_RULES,
  REACT_COMPILER_OXLINT_RULES,
  REACT_NATIVE_OXLINT_RULES,
  TANSTACK_AI_OXLINT_RULES,
  TANSTACK_QUERY_OXLINT_RULES,
  TANSTACK_START_OXLINT_RULES,
} from "./presets.js";
import type { OxlintRuleSeverityMap } from "./presets.js";

const esmRequire = createRequire(import.meta.url);

const REACT_HOOKS_JS_NAMESPACE = "react-hooks-js";
const REACT_HOOKS_PLUGIN_SPECIFIER = "eslint-plugin-react-hooks";

export type ReactDoctorOxlintFramework =
  | "expo"
  | "nextjs"
  | "react"
  | "react-native"
  | "tanstack-start"
  | "unknown";

export interface ReactDoctorOxlintConfigOptions {
  pluginPath: string;
  project?: ReactDoctorOxlintProjectInfo;
  framework?: ReactDoctorOxlintFramework;
  customRulesOnly?: boolean;
  hasReactCompiler?: boolean;
  hasTanStackAI?: boolean;
  hasTanStackQuery?: boolean;
  includeEcosystemRules?: boolean;
  extendsPaths?: string[];
  ignoredTags?: ReadonlySet<string>;
}

export interface ReactDoctorOxlintProjectInfo {
  framework?: ReactDoctorOxlintFramework;
  hasReactCompiler?: boolean;
  hasTanStackAI?: boolean;
  hasTanStackQuery?: boolean;
  hasTypeScript?: boolean;
  reactMajorVersion?: number | null;
  reactPeerDependencyRange?: string | null;
  tailwindVersion?: string | null;
}

export interface ReactDoctorOxlintJsPluginEntry {
  name: string;
  specifier: string;
}

export interface ReactDoctorOxlintGeneratedConfig {
  extends?: string[];
  categories: Record<string, "off">;
  plugins: string[];
  jsPlugins: Array<string | ReactDoctorOxlintJsPluginEntry>;
  rules: OxlintRuleSeverityMap;
}

interface MaybePluginModule {
  rules?: Record<string, unknown>;
  default?: { rules?: Record<string, unknown> };
}

interface ResolvedPlugin {
  entry: ReactDoctorOxlintJsPluginEntry;
  availableRuleNames: ReadonlySet<string>;
}

interface RuleMetadataEntry {
  requires?: ReadonlyArray<string>;
  tags: ReadonlySet<string>;
}

const EMPTY_TAGS: ReadonlySet<string> = new Set();
const TEST_NOISE_TAGS: ReadonlySet<string> = new Set(["test-noise"]);
const DESIGN_AND_TEST_NOISE_TAGS: ReadonlySet<string> = new Set(["design", "test-noise"]);
const TAILWIND_VERSION_PATTERN = /(?:^|[^\d])(\d+)(?:\.(\d+))?/;
const PEER_COMPARATOR_SEPARATOR = /[\s,|]+/;
const PEER_WILDCARD_COMPARATOR = /^[*xX](?:\.[*xX])*$/;

const RULE_METADATA: ReadonlyMap<string, RuleMetadataEntry> = new Map([
  ["react-doctor/no-react19-deprecated-apis", { requires: ["react:19"], tags: TEST_NOISE_TAGS }],
  ["react-doctor/no-default-props", { requires: ["react:19"], tags: TEST_NOISE_TAGS }],
  ["react-doctor/no-react-dom-deprecated-apis", { requires: ["react:18"], tags: TEST_NOISE_TAGS }],
  ["react-doctor/prefer-use-effect-event", { requires: ["react:19"], tags: TEST_NOISE_TAGS }],
  ["react-doctor/design-no-bold-heading", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/design-no-redundant-padding-axes", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  [
    "react-doctor/design-no-redundant-size-axes",
    { requires: ["tailwind:3.4"], tags: DESIGN_AND_TEST_NOISE_TAGS },
  ],
  ["react-doctor/design-no-space-on-flex-children", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/design-no-three-period-ellipsis", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/design-no-default-tailwind-palette", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/design-no-vague-button-label", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/no-side-tab-border", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/no-pure-black-background", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/no-gradient-text", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/no-dark-mode-glow", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/no-justified-text", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/no-tiny-text", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/no-wide-letter-spacing", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/no-gray-on-colored-background", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/no-layout-transition-inline", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/no-outline-none", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
  ["react-doctor/no-long-transition-duration", { tags: DESIGN_AND_TEST_NOISE_TAGS }],
]);

const readPluginRuleNames = (pluginSpecifier: string): ReadonlySet<string> => {
  try {
    const pluginModule: MaybePluginModule = esmRequire(pluginSpecifier);
    const rules = pluginModule.rules ?? pluginModule.default?.rules;
    return rules ? new Set(Object.keys(rules)) : new Set();
  } catch {
    return new Set();
  }
};

const resolveOptionalJsPlugin = (
  namespace: string,
  pluginSpecifier: string,
): ResolvedPlugin | null => {
  try {
    const resolvedSpecifier = esmRequire.resolve(pluginSpecifier);
    return {
      entry: { name: namespace, specifier: resolvedSpecifier },
      availableRuleNames: readPluginRuleNames(resolvedSpecifier),
    };
  } catch {
    return null;
  }
};

const filterRulesToAvailable = (
  rules: OxlintRuleSeverityMap,
  pluginNamespace: string,
  availableRuleNames: ReadonlySet<string>,
): OxlintRuleSeverityMap => {
  if (availableRuleNames.size === 0) return rules;
  const ruleKeyPrefix = `${pluginNamespace}/`;
  const filteredRules: OxlintRuleSeverityMap = {};
  for (const [ruleKey, severity] of Object.entries(rules)) {
    if (!ruleKey.startsWith(ruleKeyPrefix)) {
      filteredRules[ruleKey] = severity;
      continue;
    }
    const ruleName = ruleKey.slice(ruleKeyPrefix.length);
    if (availableRuleNames.has(ruleName)) {
      filteredRules[ruleKey] = severity;
    }
  }
  return filteredRules;
};

const buildOptionalReactCompilerConfig = (
  customRulesOnly: boolean,
  hasReactCompiler: boolean,
): { jsPlugin: ReactDoctorOxlintJsPluginEntry | null; rules: OxlintRuleSeverityMap } => {
  if (customRulesOnly || !hasReactCompiler) return { jsPlugin: null, rules: {} };
  const plugin = resolveOptionalJsPlugin(REACT_HOOKS_JS_NAMESPACE, REACT_HOOKS_PLUGIN_SPECIFIER);
  if (!plugin) return { jsPlugin: null, rules: {} };
  return {
    jsPlugin: plugin.entry,
    rules: filterRulesToAvailable(
      REACT_COMPILER_OXLINT_RULES,
      REACT_HOOKS_JS_NAMESPACE,
      plugin.availableRuleNames,
    ),
  };
};

export const BUILTIN_OXLINT_RULES: OxlintRuleSeverityMap = {
  ...BUILTIN_REACT_OXLINT_RULES,
  ...BUILTIN_A11Y_OXLINT_RULES,
};

const parseMajorMinor = (
  version: string | null | undefined,
): { major: number; minor: number } | null => {
  if (!version) return null;
  const match = version.match(TAILWIND_VERSION_PATTERN);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: match[2] ? Number.parseInt(match[2], 10) : 0,
  };
};

const isTailwindAtLeast = (
  version: { major: number; minor: number } | null,
  minimum: { major: number; minor: number },
): boolean => {
  if (!version) return true;
  if (version.major > minimum.major) return true;
  if (version.major < minimum.major) return false;
  return version.minor >= minimum.minor;
};

const comparatorMajor = (comparator: string): number | null => {
  if (PEER_WILDCARD_COMPARATOR.test(comparator)) return null;
  const firstIntegerMatch = comparator.match(/\d+/);
  if (!firstIntegerMatch) return null;
  const major = Number.parseInt(firstIntegerMatch[0], 10);
  return major >= 1 ? major : null;
};

export const reactPeerRangeMinMajor = (range: string | null | undefined): number | null => {
  if (typeof range !== "string") return null;
  let lowestMajor: number | null = null;
  for (const comparator of range.trim().split(PEER_COMPARATOR_SEPARATOR).filter(Boolean)) {
    const major = comparatorMajor(comparator);
    if (major !== null && (lowestMajor === null || major < lowestMajor)) {
      lowestMajor = major;
    }
  }
  return lowestMajor;
};

const effectiveReactMajor = (project: ReactDoctorOxlintProjectInfo): number => {
  const installedMajor = project.reactMajorVersion ?? null;
  const peerMajor = reactPeerRangeMinMajor(project.reactPeerDependencyRange);
  if (installedMajor !== null && peerMajor !== null) return Math.min(installedMajor, peerMajor);
  return installedMajor ?? peerMajor ?? 99;
};

export const buildReactDoctorOxlintCapabilities = (
  project: ReactDoctorOxlintProjectInfo,
): ReadonlySet<string> => {
  const capabilities = new Set<string>();
  const framework = project.framework ?? "unknown";
  capabilities.add(framework);
  if (framework === "expo" || framework === "react-native") capabilities.add("react-native");

  const reactMajor = effectiveReactMajor(project);
  for (let major = 17; major <= reactMajor; major++) {
    capabilities.add(`react:${major}`);
  }

  if (project.tailwindVersion !== null) {
    capabilities.add("tailwind");
    if (isTailwindAtLeast(parseMajorMinor(project.tailwindVersion), { major: 3, minor: 4 })) {
      capabilities.add("tailwind:3.4");
    }
  }

  if (project.hasReactCompiler) capabilities.add("react-compiler");
  if (project.hasTanStackAI) capabilities.add("tanstack-ai");
  if (project.hasTanStackQuery) capabilities.add("tanstack-query");
  if (project.hasTypeScript) capabilities.add("typescript");
  return capabilities;
};

export const shouldEnableReactDoctorOxlintRule = (
  requires: ReadonlyArray<string> | undefined,
  tags: ReadonlySet<string>,
  capabilities: ReadonlySet<string>,
  ignoredTags: ReadonlySet<string>,
): boolean => {
  if (requires) {
    for (const capability of requires) {
      if (!capabilities.has(capability)) return false;
    }
  }
  for (const tag of tags) {
    if (ignoredTags.has(tag)) return false;
  }
  return true;
};

const addEnabledRules = (
  target: OxlintRuleSeverityMap,
  rules: OxlintRuleSeverityMap,
  capabilities: ReadonlySet<string>,
  ignoredTags: ReadonlySet<string>,
  defaultRequires?: ReadonlyArray<string>,
): void => {
  for (const [ruleKey, severity] of Object.entries(rules)) {
    const metadata = RULE_METADATA.get(ruleKey);
    const requires = metadata?.requires ?? defaultRequires;
    const tags = metadata?.tags ?? EMPTY_TAGS;
    if (shouldEnableReactDoctorOxlintRule(requires, tags, capabilities, ignoredTags)) {
      target[ruleKey] = severity;
    }
  }
};

export const createReactDoctorOxlintConfig = ({
  pluginPath,
  project,
  framework = "unknown",
  customRulesOnly = false,
  hasReactCompiler = false,
  hasTanStackAI = false,
  hasTanStackQuery = false,
  includeEcosystemRules = true,
  extendsPaths = [],
  ignoredTags = new Set(),
}: ReactDoctorOxlintConfigOptions): ReactDoctorOxlintGeneratedConfig => {
  const projectInfo: ReactDoctorOxlintProjectInfo = project ?? {
    framework,
    hasReactCompiler,
    hasTanStackAI,
    hasTanStackQuery,
  };
  const capabilities = buildReactDoctorOxlintCapabilities(projectInfo);
  const reactCompilerConfig = buildOptionalReactCompilerConfig(
    customRulesOnly,
    Boolean(projectInfo.hasReactCompiler),
  );
  const jsPlugins: Array<string | ReactDoctorOxlintJsPluginEntry> = [];
  if (reactCompilerConfig.jsPlugin) jsPlugins.push(reactCompilerConfig.jsPlugin);
  jsPlugins.push(pluginPath);
  const enabledReactDoctorRules: OxlintRuleSeverityMap = {};
  addEnabledRules(
    enabledReactDoctorRules,
    GLOBAL_REACT_DOCTOR_OXLINT_RULES,
    capabilities,
    ignoredTags,
  );
  addEnabledRules(enabledReactDoctorRules, NEXTJS_OXLINT_RULES, capabilities, ignoredTags, [
    "nextjs",
  ]);
  addEnabledRules(enabledReactDoctorRules, REACT_NATIVE_OXLINT_RULES, capabilities, ignoredTags, [
    "react-native",
  ]);
  addEnabledRules(enabledReactDoctorRules, TANSTACK_START_OXLINT_RULES, capabilities, ignoredTags, [
    "tanstack-start",
  ]);
  addEnabledRules(enabledReactDoctorRules, TANSTACK_AI_OXLINT_RULES, capabilities, ignoredTags, [
    "tanstack-ai",
  ]);
  addEnabledRules(enabledReactDoctorRules, TANSTACK_QUERY_OXLINT_RULES, capabilities, ignoredTags, [
    "tanstack-query",
  ]);
  if (includeEcosystemRules) {
    addEnabledRules(enabledReactDoctorRules, ECOSYSTEM_OXLINT_RULES, capabilities, ignoredTags);
  }

  return {
    ...(extendsPaths.length > 0 ? { extends: extendsPaths } : {}),
    categories: {
      correctness: "off",
      nursery: "off",
      pedantic: "off",
      perf: "off",
      restriction: "off",
      style: "off",
      suspicious: "off",
    },
    plugins: customRulesOnly ? [] : ["react", "jsx-a11y"],
    jsPlugins,
    rules: {
      ...(customRulesOnly ? {} : BUILTIN_OXLINT_RULES),
      ...reactCompilerConfig.rules,
      ...enabledReactDoctorRules,
    },
  };
};
