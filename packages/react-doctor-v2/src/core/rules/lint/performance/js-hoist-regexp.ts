import { defineRule } from "../../registry.js";
import { createLoopAwareVisitors, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const jsHoistRegexp = defineRule<Rule>({
  recommendation:
    "Hoist RegExp construction out of loops, renders, and hot functions when the pattern is constant.",
  examples: [
    {
      before: `items.filter((item) => /react/i.test(item.name));`,
      after: `const REACT_PATTERN = /react/i;
items.filter((item) => REACT_PATTERN.test(item.name));`,
    },
  ],
  create: (context: RuleContext) =>
    createLoopAwareVisitors({
      NewExpression(node: EsTreeNode) {
        if (isNodeOfType(node.callee, "Identifier") && node.callee.name === "RegExp") {
          context.report({
            node,
            message: "new RegExp() inside a loop - hoist to a module-level constant",
          });
        }
      },
    }),
});
