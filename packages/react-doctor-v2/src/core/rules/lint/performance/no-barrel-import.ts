import { defineRule } from "../../registry.js";
import { BARREL_INDEX_SUFFIXES } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noBarrelImport = defineRule<Rule>({
  recommendation:
    "Import directly from source files or configure framework-level package import optimization instead of importing through large barrels.",
  examples: [
    {
      before: `import { Button } from "@ui";`,
      after: `import { Button } from "@ui/button";`,
    },
  ],
  create: (context: RuleContext) => {
    let didReportForFile = false;

    return {
      ImportDeclaration(node: EsTreeNode) {
        if (didReportForFile) return;

        const source = node.source?.value;
        if (typeof source !== "string" || !source.startsWith(".")) return;

        if (BARREL_INDEX_SUFFIXES.some((suffix) => source.endsWith(suffix))) {
          didReportForFile = true;
          context.report({
            node,
            message:
              "Import from barrel/index file - import directly from the source module for better tree-shaking",
          });
        }
      },
    };
  },
});
