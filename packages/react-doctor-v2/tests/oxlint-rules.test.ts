import { describe, expect, it } from "vite-plus/test";
import {
  BUILTIN_A11Y_OXLINT_RULES,
  BUILTIN_REACT_OXLINT_RULES,
  REACT_DOCTOR_OXLINT_RULE_ID_PREFIX,
  REACT_DOCTOR_CUSTOM_OXLINT_RULES,
  createReactDoctorOxlintConfig,
  reactPeerRangeMinMajor,
  reactDoctorOxlintPlugin,
  reactDoctorOxlintRuleMetadata,
} from "../src/sdk/index.js";

const toExpectedSeverity = (ruleName: string): "error" | "warning" | "info" => {
  const oxlintSeverity = REACT_DOCTOR_CUSTOM_OXLINT_RULES[`react-doctor/${ruleName}`] ?? "warn";
  if (oxlintSeverity === "error") return "error";
  if (oxlintSeverity === "off") return "info";
  return "warning";
};

describe("oxlint rules", () => {
  it("exports metadata for every custom oxlint plugin rule", () => {
    const pluginRuleNames = Object.keys(reactDoctorOxlintPlugin.rules).sort();

    expect(reactDoctorOxlintRuleMetadata.map((rule) => rule.oxlintRuleName)).toEqual(
      pluginRuleNames,
    );
    expect(reactDoctorOxlintRuleMetadata.every((rule) => Boolean(rule.recommendation))).toBe(true);
    expect(
      reactDoctorOxlintRuleMetadata.every(
        (rule) =>
          rule.examples?.every(
            (example) => example.before.trim().length > 0 && example.after.trim().length > 0,
          ) ?? true,
      ),
    ).toBe(true);
    expect(reactDoctorOxlintRuleMetadata).toEqual(
      pluginRuleNames.map((ruleName) => ({
        id: `${REACT_DOCTOR_OXLINT_RULE_ID_PREFIX}${ruleName}`,
        name: expect.any(String),
        description: `Runs the react-doctor/${ruleName} custom oxlint rule.`,
        recommendation: expect.any(String),
        examples: expect.any(Array),
        category: "oxlint",
        severity: toExpectedSeverity(ruleName),
        defaultEnabled: false,
        tags: ["oxlint", "custom", "react-doctor"],
        oxlintRuleName: ruleName,
        oxlintRuleKey: `react-doctor/${ruleName}`,
      })),
    );
  });

  it("builds the legacy curated oxlint config with built-in plugin rules", () => {
    const config = createReactDoctorOxlintConfig({
      pluginPath: "/tmp/react-doctor-plugin.js",
      framework: "nextjs",
      hasTanStackQuery: true,
    });

    expect(config.plugins).toEqual(["react", "jsx-a11y"]);
    expect(config.jsPlugins).toContain("/tmp/react-doctor-plugin.js");
    expect(config.jsPlugins).not.toContainEqual(expect.objectContaining({ name: "effect" }));
    expect(config.categories).toEqual({
      correctness: "off",
      nursery: "off",
      pedantic: "off",
      perf: "off",
      restriction: "off",
      style: "off",
      suspicious: "off",
    });
    expect(config.rules).toMatchObject({
      ...BUILTIN_REACT_OXLINT_RULES,
      ...BUILTIN_A11Y_OXLINT_RULES,
      "react-doctor/nextjs-no-img-element": "warn",
      "react-doctor/effect-no-derived-state": "warn",
      "react-doctor/effect-no-initialize-state": "warn",
      "react-doctor/query-no-unstable-query-key": "error",
    });
  });

  it("supports custom-rule-only oxlint configs", () => {
    const config = createReactDoctorOxlintConfig({
      pluginPath: "/tmp/react-doctor-plugin.js",
      customRulesOnly: true,
    });

    expect(config.plugins).toEqual([]);
    expect(config.rules["react/rules-of-hooks"]).toBeUndefined();
    expect(config.rules["jsx-a11y/alt-text"]).toBeUndefined();
    expect(config.rules["react-doctor/no-fetch-in-effect"]).toBe("warn");
  });

  it("gates framework, version, and tag-scoped rules", () => {
    const react18Config = createReactDoctorOxlintConfig({
      pluginPath: "/tmp/react-doctor-plugin.js",
      project: {
        framework: "react",
        reactMajorVersion: 18,
        hasTanStackQuery: true,
      },
      ignoredTags: new Set(["design"]),
    });

    expect(react18Config.rules["react-doctor/no-react19-deprecated-apis"]).toBeUndefined();
    expect(react18Config.rules["react-doctor/prefer-use-effect-event"]).toBeUndefined();
    expect(react18Config.rules["react-doctor/query-no-unstable-query-key"]).toBe("error");
    expect(react18Config.rules["react-doctor/rn-no-raw-text"]).toBeUndefined();
    expect(react18Config.rules["react-doctor/design-no-bold-heading"]).toBeUndefined();
    expect(react18Config.rules["react-doctor/design-no-em-dash-in-jsx-text"]).toBeUndefined();
  });

  it("uses React peer range floors for library-oriented version gates", () => {
    expect(reactPeerRangeMinMajor("^17 || ^18 || ^19")).toBe(17);

    const libraryConfig = createReactDoctorOxlintConfig({
      pluginPath: "/tmp/react-doctor-plugin.js",
      project: {
        framework: "react",
        reactMajorVersion: 19,
        reactPeerDependencyRange: "^17 || ^18 || ^19",
      },
    });

    expect(libraryConfig.rules["react-doctor/no-react19-deprecated-apis"]).toBeUndefined();
    expect(libraryConfig.rules["react-doctor/no-default-props"]).toBeUndefined();
  });
});
