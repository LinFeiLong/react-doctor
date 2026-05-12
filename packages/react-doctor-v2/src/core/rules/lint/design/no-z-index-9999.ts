import { defineRule } from "../../registry.js";
import {
  Z_INDEX_ABSURD_THRESHOLD,
  getInlineStyleExpression,
  getStylePropertyKey,
  getStylePropertyNumberValue,
  walkAst,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noZIndex9999 = defineRule<Rule>({
  recommendation:
    "Use a small named z-index scale and fix stacking contexts instead of escalating to arbitrary extreme z-index values.",
  examples: [
    {
      before: `style={{ zIndex: 9999 }}`,
      after: `className="z-popover"`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (key !== "zIndex") continue;

        const zValue = getStylePropertyNumberValue(property);
        if (zValue !== null && Math.abs(zValue) >= Z_INDEX_ABSURD_THRESHOLD) {
          context.report({
            node: property,
            message: `z-index: ${zValue} is arbitrarily high - use a deliberate z-index scale (1-50). Extreme values signal a stacking context problem, not a fix`,
          });
        }
      }
    },
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;
      if (
        !isNodeOfType(node.callee.property, "Identifier") ||
        node.callee.property.name !== "create"
      )
        return;
      if (
        !isNodeOfType(node.callee.object, "Identifier") ||
        node.callee.object.name !== "StyleSheet"
      )
        return;

      const argument = node.arguments?.[0];
      if (!argument || !isNodeOfType(argument, "ObjectExpression")) return;

      walkAst(argument, (child: EsTreeNode) => {
        if (!isNodeOfType(child, "Property")) return;
        const key = getStylePropertyKey(child);
        if (key !== "zIndex") return;

        if (isNodeOfType(child.value, "Literal") && typeof child.value.value === "number") {
          const zValue = child.value.value;
          if (Math.abs(zValue) >= Z_INDEX_ABSURD_THRESHOLD) {
            context.report({
              node: child,
              message: `z-index: ${zValue} is arbitrarily high - use a deliberate z-index scale (1-50). Extreme values signal a stacking context problem, not a fix`,
            });
          }
        }
      });
    },
  }),
});
