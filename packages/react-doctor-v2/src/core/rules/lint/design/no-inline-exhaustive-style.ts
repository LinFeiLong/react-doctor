import { defineRule } from "../../registry.js";
import {
  INLINE_STYLE_PROPERTY_THRESHOLD,
  getInlineStyleExpression,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noInlineExhaustiveStyle = defineRule<Rule>({
  recommendation:
    "Move large inline style objects to classes, CSS variables, or focused style helpers so design tokens remain reusable.",
  examples: [
    {
      before: `<div style={{ display: "flex", gap: 8, padding: 12 }} />`,
      after: `<div className="flex gap-2 p-3" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      const propertyCount =
        expression.properties?.filter((property: EsTreeNode) => isNodeOfType(property, "Property"))
          .length ?? 0;

      if (propertyCount >= INLINE_STYLE_PROPERTY_THRESHOLD) {
        context.report({
          node: expression,
          message: `${propertyCount} inline style properties - extract to a CSS class, CSS module, or styled component for maintainability and reuse`,
        });
      }
    },
  }),
});
