import { reactProjectStructureRule } from "./react-project-structure.js";
import { createRuleRegistry as createBaseRuleRegistry } from "./registry.js";
import type { RuleRegistryOptions } from "./registry.js";
import type { ReactDoctorRule } from "./types.js";

export { defineRule } from "./registry.js";
export type {
  ReactDoctorRule,
  ReactDoctorRuleContext,
  ReactDoctorRuleExample,
  ReactDoctorRuleMetadata,
  ReactDoctorRuleResult,
} from "./types.js";
export * from "./lint/index.js";
export { reactProjectStructureRule };

export const coreRules: ReactDoctorRule[] = [reactProjectStructureRule];

export const createRuleRegistry = (options: RuleRegistryOptions = {}) =>
  createBaseRuleRegistry({
    ...options,
    rules: options.rules ?? coreRules,
  });

export const ruleRegistry = createRuleRegistry();
