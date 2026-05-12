import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const expoNoAxios = defineRule<Rule>({
  recommendation:
    "Use the platform fetch API in Expo apps instead of axios so networking stays aligned with Expo runtime behavior, AbortController, and standard Request/Response handling.",
  examples: [
    {
      before: `import axios from "axios";`,
      after: `const response = await fetch(url);`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (node.source?.value !== "axios") return;
      context.report({
        node,
        message:
          "axios imported in Expo networking code - prefer fetch with explicit response.ok handling",
      });
    },
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "Identifier") || node.callee.name !== "require") return;
      const source = node.arguments?.[0];
      if (!isNodeOfType(source, "Literal") || source.value !== "axios") return;
      context.report({
        node,
        message:
          "axios required in Expo networking code - prefer fetch with explicit response.ok handling",
      });
    },
  }),
});
