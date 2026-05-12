import { ReactDoctorInvalidConfigError, toReactDoctorErrorInfo } from "../errors.js";
import type { ReactDoctorCheckResult, ReactDoctorRuleSelection } from "../types.js";
import type { ReactDoctorRule, ReactDoctorRuleMetadata } from "./types.js";

export interface DefineRule {
  (rule: ReactDoctorRule): ReactDoctorRule;
  <RuleDefinition>(rule: RuleDefinition): RuleDefinition;
}

export const defineRule: DefineRule = <RuleDefinition>(rule: RuleDefinition): RuleDefinition =>
  rule;

export interface RuleRegistryOptions {
  rules?: ReactDoctorRule[];
  enabledRuleIds?: string[];
  disabledRuleIds?: string[];
}

export interface ReactDoctorRuleRegistry {
  listRules: () => ReactDoctorRule[];
  listMetadata: () => ReactDoctorRuleMetadata[];
  getRule: (ruleId: string) => ReactDoctorRule | null;
  isRuleEnabled: (ruleId: string, selection?: ReactDoctorRuleSelection) => boolean;
  selectRules: (selection?: ReactDoctorRuleSelection) => ReactDoctorRule[];
  runRules: (context: RunRulesContext) => Promise<ReactDoctorCheckResult[]>;
  enableRule: (ruleId: string) => ReactDoctorRuleRegistry;
  disableRule: (ruleId: string) => ReactDoctorRuleRegistry;
}

export interface RunRulesContext {
  rootDirectory: string;
  selection?: ReactDoctorRuleSelection;
  signal?: AbortSignal;
}

const toRuleMap = (rules: ReactDoctorRule[]): Map<string, ReactDoctorRule> => {
  const ruleMap = new Map<string, ReactDoctorRule>();

  for (const rule of rules) {
    const existingRule = ruleMap.get(rule.metadata.id);
    if (existingRule) {
      throw new ReactDoctorInvalidConfigError(
        `Duplicate React Doctor rule id: ${rule.metadata.id}`,
      );
    }
    ruleMap.set(rule.metadata.id, rule);
  }

  return ruleMap;
};

const assertKnownRule = (ruleMap: Map<string, ReactDoctorRule>, ruleId: string): void => {
  if (!ruleMap.has(ruleId)) {
    throw new ReactDoctorInvalidConfigError(`Unknown React Doctor rule id: ${ruleId}`);
  }
};

const toRuleSelection = (options: RuleRegistryOptions): ReactDoctorRuleSelection => ({
  enabledRuleIds: options.enabledRuleIds,
  disabledRuleIds: options.disabledRuleIds,
});

const mergeSelections = (
  baseSelection: ReactDoctorRuleSelection,
  overrideSelection: ReactDoctorRuleSelection = {},
): ReactDoctorRuleSelection => ({
  enabledRuleIds: [
    ...(baseSelection.enabledRuleIds ?? []),
    ...(overrideSelection.enabledRuleIds ?? []),
  ],
  disabledRuleIds: [
    ...(baseSelection.disabledRuleIds ?? []),
    ...(overrideSelection.disabledRuleIds ?? []),
  ],
});

const runRule = async (
  rule: ReactDoctorRule,
  context: RunRulesContext,
): Promise<ReactDoctorCheckResult> => {
  const startedMilliseconds = globalThis.performance.now();

  try {
    context.signal?.throwIfAborted();
    const result = await rule.run({
      rootDirectory: context.rootDirectory,
      signal: context.signal,
    });

    return {
      id: rule.metadata.id,
      name: rule.metadata.name,
      status: "completed",
      issues: result.issues,
      durationMilliseconds: globalThis.performance.now() - startedMilliseconds,
    };
  } catch (error) {
    return {
      id: rule.metadata.id,
      name: rule.metadata.name,
      status: "failed",
      issues: [],
      durationMilliseconds: globalThis.performance.now() - startedMilliseconds,
      error: toReactDoctorErrorInfo(error),
    };
  }
};

export const createRuleRegistry = (options: RuleRegistryOptions = {}): ReactDoctorRuleRegistry => {
  const rules = options.rules ?? [];
  const ruleMap = toRuleMap(rules);
  const defaultSelection = toRuleSelection(options);

  const validateSelection = (selection: ReactDoctorRuleSelection = {}): void => {
    for (const ruleId of selection.enabledRuleIds ?? []) {
      assertKnownRule(ruleMap, ruleId);
    }
    for (const ruleId of selection.disabledRuleIds ?? []) {
      assertKnownRule(ruleMap, ruleId);
    }
  };

  const isRuleEnabled = (ruleId: string, selection: ReactDoctorRuleSelection = {}): boolean => {
    assertKnownRule(ruleMap, ruleId);
    const mergedSelection = mergeSelections(defaultSelection, selection);
    validateSelection(mergedSelection);

    if (mergedSelection.disabledRuleIds?.includes(ruleId)) return false;
    if (mergedSelection.enabledRuleIds?.includes(ruleId)) return true;

    const rule = ruleMap.get(ruleId);
    return Boolean(rule?.metadata.defaultEnabled);
  };

  const registry: ReactDoctorRuleRegistry = {
    listRules: () => [...rules],
    listMetadata: () => rules.map((rule) => rule.metadata),
    getRule: (ruleId) => ruleMap.get(ruleId) ?? null,
    isRuleEnabled,
    selectRules: (selection = {}) => {
      validateSelection(selection);
      return rules.filter((rule) => isRuleEnabled(rule.metadata.id, selection));
    },
    runRules: async (context) => {
      const selectedRules = registry.selectRules(context.selection);
      return Promise.all(selectedRules.map((rule) => runRule(rule, context)));
    },
    enableRule: (ruleId) => {
      assertKnownRule(ruleMap, ruleId);
      return createRuleRegistry({
        rules,
        enabledRuleIds: [...(defaultSelection.enabledRuleIds ?? []), ruleId],
        disabledRuleIds: (defaultSelection.disabledRuleIds ?? []).filter(
          (disabledRuleId) => disabledRuleId !== ruleId,
        ),
      });
    },
    disableRule: (ruleId) => {
      assertKnownRule(ruleMap, ruleId);
      return createRuleRegistry({
        rules,
        enabledRuleIds: (defaultSelection.enabledRuleIds ?? []).filter(
          (enabledRuleId) => enabledRuleId !== ruleId,
        ),
        disabledRuleIds: [...(defaultSelection.disabledRuleIds ?? []), ruleId],
      });
    },
  };

  validateSelection(defaultSelection);
  return registry;
};
