import { defineRule } from "../../registry.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noFullLodashImport = defineRule<Rule>({
  recommendation:
    "Import only the lodash functions you use, or replace them with native JavaScript helpers where practical.",
  examples: [
    {
      before: `import _ from "lodash";`,
      after: `import debounce from "lodash/debounce";`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      const source = node.source?.value;
      if (source === "lodash" || source === "lodash-es") {
        context.report({
          node,
          message: "Importing entire lodash library - import from 'lodash/functionName' instead",
        });
      }
    },
  }),
});
