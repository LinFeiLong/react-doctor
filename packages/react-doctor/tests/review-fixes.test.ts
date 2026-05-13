import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import reactDoctorEslintPlugin from "../src/eslint-plugin.js";
import {
  GLOBAL_REACT_DOCTOR_OXLINT_RULES,
  REACT_DOCTOR_CUSTOM_OXLINT_RULES,
  createReactDoctorOxlintConfig,
  reactDoctorOxlintPlugin,
} from "../src/sdk/index.js";
import { ECOSYSTEM_OXLINT_RULES } from "../src/core/rules/lint/config.js";
import { TEST_OR_INFRA_FILE_PATTERN } from "../src/core/rules/lint/constants.js";
import { isWebOnlyPath } from "../src/core/rules/lint/react-native/utils/is-web-only-path.js";
import { buildPreventDefaultMessage } from "../src/core/rules/lint/react/utils/build-prevent-default-message.js";
import type { EsTreeNode } from "../src/core/rules/lint/utils/index.js";

const createdFixtureDirectories: string[] = [];

afterEach(async () => {
  while (createdFixtureDirectories.length > 0) {
    const fixtureDirectory = createdFixtureDirectories.pop();
    if (!fixtureDirectory) continue;
    await fs.rm(fixtureDirectory, { recursive: true, force: true });
  }
});

describe("tailwind rule recategorization", () => {
  const renamedRuleNames = [
    "tailwind-no-redundant-padding-axes",
    "tailwind-no-redundant-size-axes",
    "tailwind-no-space-on-flex-children",
    "tailwind-no-default-palette",
  ];

  it("moved Tailwind shorthand rules from global to ecosystem rules", () => {
    for (const ruleName of renamedRuleNames) {
      const globalKey = `react-doctor/${ruleName}`;
      expect(GLOBAL_REACT_DOCTOR_OXLINT_RULES[globalKey]).toBeUndefined();
      expect(ECOSYSTEM_OXLINT_RULES[globalKey]).toBeDefined();
    }
  });

  it("old design-* keys no longer exist in the rule map", () => {
    const oldNames = [
      "design-no-redundant-padding-axes",
      "design-no-redundant-size-axes",
      "design-no-space-on-flex-children",
      "design-no-default-tailwind-palette",
    ];
    for (const oldName of oldNames) {
      expect(REACT_DOCTOR_CUSTOM_OXLINT_RULES[`react-doctor/${oldName}`]).toBeUndefined();
    }
  });

  it("includes ecosystem rules when includeEcosystemRules is true", () => {
    const config = createReactDoctorOxlintConfig({
      pluginPath: "/tmp/plugin.js",
      includeEcosystemRules: true,
    });
    expect(config.rules["react-doctor/tailwind-no-redundant-size-axes"]).toBeDefined();
  });

  it("excludes ecosystem rules when includeEcosystemRules is false", () => {
    const config = createReactDoctorOxlintConfig({
      pluginPath: "/tmp/plugin.js",
      includeEcosystemRules: false,
    });
    expect(config.rules["react-doctor/tailwind-no-redundant-size-axes"]).toBeUndefined();
  });

  it("resolves optional JS plugins from the scanned project root", async () => {
    const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "react-doctor-plugin-root-"));
    createdFixtureDirectories.push(rootDirectory);
    const pluginDirectory = path.join(
      rootDirectory,
      "node_modules/eslint-plugin-react-you-might-not-need-an-effect",
    );
    await fs.mkdir(pluginDirectory, { recursive: true });
    await fs.writeFile(
      path.join(pluginDirectory, "package.json"),
      JSON.stringify({
        name: "eslint-plugin-react-you-might-not-need-an-effect",
        main: "index.js",
      }),
    );
    await fs.writeFile(
      path.join(pluginDirectory, "index.js"),
      "module.exports = { rules: { 'no-derived-state': {} } };\n",
    );

    const config = createReactDoctorOxlintConfig({
      pluginPath: "/tmp/plugin.js",
      projectRootDirectory: rootDirectory,
    });

    const effectPlugin = config.jsPlugins.find(
      (plugin) =>
        typeof plugin === "object" && plugin !== null && Reflect.get(plugin, "name") === "effect",
    );
    expect(effectPlugin).toBeDefined();
    expect(config.rules["effect/no-derived-state"]).toBe("warn");
  });
});

describe("eslint plugin export", () => {
  it("preserves the published flat config shape", () => {
    expect(reactDoctorEslintPlugin.configs.recommended.plugins["react-doctor"]).toBe(
      reactDoctorEslintPlugin,
    );
    expect(reactDoctorEslintPlugin.configs.next.rules["react-doctor/nextjs-no-img-element"]).toBe(
      "warn",
    );
    expect(reactDoctorEslintPlugin.configs.all.rules["react-doctor/no-fetch-in-effect"]).toBe(
      "warn",
    );
  });
});

describe("js-length-check-first guard detection", () => {
  const createEveryCallNode = (parent?: EsTreeNode): EsTreeNode => {
    const indexParam: EsTreeNode = { type: "Identifier", name: "i" };
    const elementParam: EsTreeNode = { type: "Identifier", name: "v" };
    const indexedAccess: EsTreeNode = {
      type: "MemberExpression",
      computed: true,
      object: { type: "Identifier", name: "b" },
      property: { type: "Identifier", name: "i" },
    };
    const comparison: EsTreeNode = {
      type: "BinaryExpression",
      operator: "===",
      left: { type: "Identifier", name: "v" },
      right: indexedAccess,
    };
    const callbackBody: EsTreeNode = {
      type: "BlockStatement",
      body: [{ type: "ReturnStatement", argument: comparison }],
    };
    const callback: EsTreeNode = {
      type: "ArrowFunctionExpression",
      params: [elementParam, indexParam],
      body: callbackBody,
    };
    const callExpression: EsTreeNode = {
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "a" },
        property: { type: "Identifier", name: "every" },
      },
      arguments: [callback],
      parent,
    };
    return callExpression;
  };

  const collectReports = (everyCallNode: EsTreeNode): EsTreeNode[] => {
    const reports: EsTreeNode[] = [];
    const visitors = reactDoctorOxlintPlugin.rules["js-length-check-first"].create({
      report: ({ node }) => reports.push(node),
    });
    visitors.CallExpression?.(everyCallNode);
    return reports;
  };

  it("flags unguarded .every() with element-wise comparison", () => {
    const everyCall = createEveryCallNode();
    expect(collectReports(everyCall)).toHaveLength(1);
  });

  it("suppresses when guarded by logical && length check", () => {
    const lengthCheck: EsTreeNode = {
      type: "BinaryExpression",
      operator: "===",
      left: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "a" },
        property: { type: "Identifier", name: "length" },
      },
      right: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "b" },
        property: { type: "Identifier", name: "length" },
      },
    };
    const logicalExpression: EsTreeNode = {
      type: "LogicalExpression",
      operator: "&&",
      left: lengthCheck,
      right: null,
    };
    const everyCall = createEveryCallNode(logicalExpression);
    logicalExpression.right = everyCall;
    expect(collectReports(everyCall)).toHaveLength(0);
  });

  it("suppresses when inside if-statement consequent with equality length check", () => {
    const lengthCheck: EsTreeNode = {
      type: "BinaryExpression",
      operator: "===",
      left: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "a" },
        property: { type: "Identifier", name: "length" },
      },
      right: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "b" },
        property: { type: "Identifier", name: "length" },
      },
    };
    const consequent: EsTreeNode = { type: "BlockStatement", body: [] };
    const ifStatement: EsTreeNode = {
      type: "IfStatement",
      test: lengthCheck,
      consequent,
      alternate: null,
    };
    const everyCall = createEveryCallNode(consequent);
    consequent.parent = ifStatement;
    expect(collectReports(everyCall)).toHaveLength(0);
  });

  it("does NOT suppress when inside if-statement alternate with equality length check", () => {
    const lengthCheck: EsTreeNode = {
      type: "BinaryExpression",
      operator: "===",
      left: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "a" },
        property: { type: "Identifier", name: "length" },
      },
      right: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "b" },
        property: { type: "Identifier", name: "length" },
      },
    };
    const alternate: EsTreeNode = { type: "BlockStatement", body: [] };
    const ifStatement: EsTreeNode = {
      type: "IfStatement",
      test: lengthCheck,
      consequent: { type: "BlockStatement", body: [] },
      alternate,
    };
    const everyCall = createEveryCallNode(alternate);
    alternate.parent = ifStatement;
    expect(collectReports(everyCall)).toHaveLength(1);
  });

  it("suppresses when inside if-statement alternate with inequality length check", () => {
    const lengthCheck: EsTreeNode = {
      type: "BinaryExpression",
      operator: "!==",
      left: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "a" },
        property: { type: "Identifier", name: "length" },
      },
      right: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "b" },
        property: { type: "Identifier", name: "length" },
      },
    };
    const alternate: EsTreeNode = { type: "BlockStatement", body: [] };
    const ifStatement: EsTreeNode = {
      type: "IfStatement",
      test: lengthCheck,
      consequent: { type: "BlockStatement", body: [] },
      alternate,
    };
    const everyCall = createEveryCallNode(alternate);
    alternate.parent = ifStatement;
    expect(collectReports(everyCall)).toHaveLength(0);
  });
});

describe("TEST_OR_INFRA_FILE_PATTERN", () => {
  it("matches standard test file extensions", () => {
    expect(TEST_OR_INFRA_FILE_PATTERN.test("component.test.ts")).toBe(true);
    expect(TEST_OR_INFRA_FILE_PATTERN.test("component.spec.tsx")).toBe(true);
    expect(TEST_OR_INFRA_FILE_PATTERN.test("Button.stories.tsx")).toBe(true);
  });

  it("matches e2e and integration test files", () => {
    expect(TEST_OR_INFRA_FILE_PATTERN.test("checkout.e2e.ts")).toBe(true);
    expect(TEST_OR_INFRA_FILE_PATTERN.test("auth.integration.ts")).toBe(true);
  });

  it("matches files in test directories", () => {
    expect(TEST_OR_INFRA_FILE_PATTERN.test("src/__tests__/utils.ts")).toBe(true);
    expect(TEST_OR_INFRA_FILE_PATTERN.test("src/tests/helper.ts")).toBe(true);
    expect(TEST_OR_INFRA_FILE_PATTERN.test("src/test/setup.ts")).toBe(true);
    expect(TEST_OR_INFRA_FILE_PATTERN.test("src/__mocks__/api.ts")).toBe(true);
    expect(TEST_OR_INFRA_FILE_PATTERN.test("src/__fixtures__/data.ts")).toBe(true);
    expect(TEST_OR_INFRA_FILE_PATTERN.test("src/fixtures/seed.ts")).toBe(true);
  });

  it("does not match regular source files", () => {
    expect(TEST_OR_INFRA_FILE_PATTERN.test("src/utils/format.ts")).toBe(false);
    expect(TEST_OR_INFRA_FILE_PATTERN.test("src/components/Button.tsx")).toBe(false);
  });
});

describe("buildPreventDefaultMessage", () => {
  it("does not mention server actions for form elements", () => {
    const message = buildPreventDefaultMessage("form");
    expect(message).not.toContain("server action");
    expect(message).toContain("action attribute");
  });

  it("suggests button or routing component for anchor elements", () => {
    const message = buildPreventDefaultMessage("a");
    expect(message).toContain("<button>");
  });
});

describe("isWebOnlyPath", () => {
  it("matches .web.tsx file extensions", () => {
    expect(isWebOnlyPath("src/components/Header.web.tsx")).toBe(true);
    expect(isWebOnlyPath("src/components/Header.web.js")).toBe(true);
  });

  it("matches web workspace directories", () => {
    expect(isWebOnlyPath("/repo/apps/web/src/App.tsx")).toBe(true);
    expect(isWebOnlyPath("/repo/packages/web/src/index.ts")).toBe(true);
    expect(isWebOnlyPath("/repo/clients/web/src/App.tsx")).toBe(true);
    expect(isWebOnlyPath("/repo/services/web/src/api.ts")).toBe(true);
  });

  it("matches web-prefixed workspace directories", () => {
    expect(isWebOnlyPath("/repo/apps/web-app/src/App.tsx")).toBe(true);
    expect(isWebOnlyPath("/repo/packages/web-client/src/index.ts")).toBe(true);
  });

  it("does not match native or shared directories", () => {
    expect(isWebOnlyPath("/repo/apps/mobile/src/App.tsx")).toBe(false);
    expect(isWebOnlyPath("/repo/packages/shared/src/utils.ts")).toBe(false);
    expect(isWebOnlyPath("/repo/src/components/Button.tsx")).toBe(false);
  });

  it("does not match regular source files", () => {
    expect(isWebOnlyPath("src/components/Header.tsx")).toBe(false);
    expect(isWebOnlyPath("src/webview/Panel.tsx")).toBe(false);
  });
});
