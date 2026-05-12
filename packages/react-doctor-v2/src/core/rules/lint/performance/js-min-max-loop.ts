import { defineRule } from "../../registry.js";
import { isMemberProperty, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const jsMinMaxLoop = defineRule<Rule>({
  recommendation:
    "Compute min or max with a single loop or reducer instead of sorting the entire collection.",
  examples: [
    {
      before: `const max = items.toSorted((a, b) => b.score - a.score)[0];`,
      after: `let max = items[0];
for (const item of items) if (item.score > max.score) max = item;`,
    },
  ],
  create: (context: RuleContext) => ({
    MemberExpression(node: EsTreeNode) {
      if (!node.computed) return;

      const object = node.object;
      if (!isNodeOfType(object, "CallExpression") || !isMemberProperty(object.callee, "sort"))
        return;

      const isFirstElement = isNodeOfType(node.property, "Literal") && node.property.value === 0;
      const isLastElement =
        isNodeOfType(node.property, "BinaryExpression") &&
        node.property.operator === "-" &&
        isNodeOfType(node.property.right, "Literal") &&
        node.property.right.value === 1;

      if (isFirstElement || isLastElement) {
        const targetFunction = isFirstElement ? "min" : "max";
        context.report({
          node,
          message: `array.sort()[${isFirstElement ? "0" : "length-1"}] for min/max - use Math.${targetFunction}(...array) instead (O(n) vs O(n log n))`,
        });
      }
    },
  }),
});
