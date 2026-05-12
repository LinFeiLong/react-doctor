import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rhfNoWatchRender = defineRule<Rule>({
  recommendation:
    "Use useWatch for render-time React Hook Form subscriptions; watch() in render subscribes broadly and can rerender the whole form.",
  examples: [
    {
      before: `const value = watch("email");`,
      after: `const value = useWatch({ control, name: "email" });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "Identifier") || node.callee.name !== "watch") return;
      context.report({
        node,
        message:
          "watch() called during render - use useWatch({ control, name }) for a focused subscription",
      });
    },
  }),
});
