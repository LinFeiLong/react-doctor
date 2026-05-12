import { describe, expect, it } from "vite-plus/test";
import {
  ReactDoctorInvalidConfigError,
  createRuleRegistry,
  defineRule,
  reactProjectStructureRule,
} from "../src/sdk/index.js";

const PROJECT_STRUCTURE_RULE_ID = "react-doctor/react-project-structure";

describe("rule registry", () => {
  it("lists rule metadata from registered rule objects", () => {
    const registry = createRuleRegistry();

    expect(registry.listMetadata()).toEqual([
      {
        id: PROJECT_STRUCTURE_RULE_ID,
        name: "React project structure",
        description: "Discovers the React project boundary and records project-level metadata.",
        category: "project",
        severity: "info",
        defaultEnabled: true,
        tags: ["project", "discovery"],
      },
    ]);
  });

  it("enables and disables rules immutably", () => {
    const registry = createRuleRegistry();
    const disabledRegistry = registry.disableRule(PROJECT_STRUCTURE_RULE_ID);
    const enabledRegistry = disabledRegistry.enableRule(PROJECT_STRUCTURE_RULE_ID);

    expect(registry.selectRules().map((rule) => rule.metadata.id)).toEqual([
      PROJECT_STRUCTURE_RULE_ID,
    ]);
    expect(disabledRegistry.selectRules()).toEqual([]);
    expect(enabledRegistry.selectRules().map((rule) => rule.metadata.id)).toEqual([
      PROJECT_STRUCTURE_RULE_ID,
    ]);
  });

  it("throws for unknown rule ids", () => {
    const registry = createRuleRegistry();

    expect(() => registry.disableRule("react-doctor/unknown")).toThrow(
      ReactDoctorInvalidConfigError,
    );
  });

  it("accepts explicitly supplied rule objects", () => {
    const registry = createRuleRegistry({ rules: [reactProjectStructureRule] });

    expect(registry.getRule(PROJECT_STRUCTURE_RULE_ID)).toBe(reactProjectStructureRule);
  });

  it("exports defineRule through the registry surface", () => {
    const rule = defineRule({
      metadata: {
        id: "react-doctor/custom-rule",
        name: "Custom rule",
        description: "Custom rule metadata.",
        category: "custom",
        severity: "warning",
        defaultEnabled: true,
        tags: ["custom"],
      },
      run: () => ({ issues: [] }),
    });
    const registry = createRuleRegistry({ rules: [rule] });

    expect(registry.getRule("react-doctor/custom-rule")).toBe(rule);
  });

  it("runs rules and captures failures as check results", async () => {
    const failingRule = defineRule({
      metadata: {
        id: "react-doctor/failing-rule",
        name: "Failing rule",
        description: "Fails during execution.",
        category: "custom",
        severity: "error",
        defaultEnabled: true,
        tags: ["custom"],
      },
      run: () => {
        throw new Error("Rule failed.");
      },
    });
    const registry = createRuleRegistry({ rules: [failingRule] });

    await expect(registry.runRules({ rootDirectory: "/repo" })).resolves.toEqual([
      {
        id: "react-doctor/failing-rule",
        name: "Failing rule",
        status: "failed",
        issues: [],
        durationMilliseconds: expect.any(Number),
        error: {
          name: "Error",
          message: "Rule failed.",
          code: "react-doctor/unknown-error",
        },
      },
    ]);
  });
});
