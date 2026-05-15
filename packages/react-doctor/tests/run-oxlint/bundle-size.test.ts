import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import type { Diagnostic } from "@react-doctor/types";
import { runOxlint } from "@react-doctor/core";
import { buildTestProject, collectRuleHits, setupReactProject } from "../regressions/_helpers.js";
import { BASIC_REACT_DIRECTORY, describeRules } from "./_helpers.js";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rd-no-barrel-import-"));

let basicReactDiagnostics: Diagnostic[];

describe("runOxlint", () => {
  beforeAll(async () => {
    basicReactDiagnostics = await runOxlint({
      rootDirectory: BASIC_REACT_DIRECTORY,
      project: buildTestProject({
        rootDirectory: BASIC_REACT_DIRECTORY,
        hasTanStackQuery: true,
      }),
    });
  });

  describeRules(
    "bundle size rules",
    {
      "no-full-lodash-import": {
        fixture: "bundle-issues.tsx",
        ruleSource: "rules/bundle-size.ts",
        category: "Bundle Size",
      },
      "no-barrel-import": {
        fixture: "bundle-issues.tsx",
        ruleSource: "rules/bundle-size.ts",
      },
      "no-moment": {
        fixture: "bundle-issues.tsx",
        ruleSource: "rules/bundle-size.ts",
      },
      "use-lazy-motion": {
        fixture: "bundle-issues.tsx",
        ruleSource: "rules/bundle-size.ts",
      },
      "prefer-dynamic-import": {
        fixture: "bundle-issues.tsx",
        ruleSource: "rules/bundle-size.ts",
      },
      "no-undeferred-third-party": {
        fixture: "bundle-issues.tsx",
        ruleSource: "rules/bundle-size.ts",
      },
    },
    () => basicReactDiagnostics,
  );

  describe("no-barrel-import", () => {
    it("does not flag a test importing the sibling index module under test", async () => {
      const projectDir = setupReactProject(tempRoot, "sibling-index-module", {
        files: {
          "src/index.ts": "export const Route = '/users';\n",
          "src/index.e2e.test.ts": "import { Route } from './index';\nvoid Route;\n",
        },
      });

      const hits = await collectRuleHits(projectDir, "no-barrel-import");

      expect(hits).toEqual([]);
    });

    it("flags explicit index and directory imports when the resolved index is a barrel", async () => {
      const projectDir = setupReactProject(tempRoot, "barrel-index-module", {
        files: {
          "src/components/Button.tsx": "export const Button = () => null;\n",
          "src/components/index.ts": "export { Button } from './Button';\n",
          "src/import-directory.tsx": "import { Button } from './components';\nvoid Button;\n",
          "src/import-explicit-index.tsx":
            "import { Button } from './components/index';\nvoid Button;\n",
          "src/import-js-extension.tsx":
            "import { Button } from './components/index.js';\nvoid Button;\n",
        },
      });

      const hits = await collectRuleHits(projectDir, "no-barrel-import");
      const hitFilePaths = hits.map((hit) => hit.filePath.replaceAll("\\", "/"));

      expect(hits).toHaveLength(3);
      expect(hitFilePaths.some((filePath) => filePath.endsWith("src/import-directory.tsx"))).toBe(
        true,
      );
      expect(
        hitFilePaths.some((filePath) => filePath.endsWith("src/import-explicit-index.tsx")),
      ).toBe(true);
      expect(
        hitFilePaths.some((filePath) => filePath.endsWith("src/import-js-extension.tsx")),
      ).toBe(true);
    });
  });
});
