import { defineRule } from "../../registry.js";
import {
  getInlineStyleExpression,
  getStylePropertyKey,
  getStylePropertyNumberValue,
  getStylePropertyStringValue,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noOutlineNone = defineRule<Rule>({
  recommendation:
    "Keep a visible focus style with focus-visible rings or outlines whenever removing the browser default outline.",
  examples: [
    {
      before: `<button className="outline-none" />`,
      after: `<button className="focus-visible:ring-2" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      let hasOutlineNone = false;
      let outlineProperty: EsTreeNode | null = null;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (key !== "outline") continue;

        const strValue = getStylePropertyStringValue(property);
        const numValue = getStylePropertyNumberValue(property);

        if (strValue === "none" || strValue === "0" || numValue === 0) {
          hasOutlineNone = true;
          outlineProperty = property;
        }
      }

      if (!hasOutlineNone || !outlineProperty) return;

      const hasCustomFocusRing = expression.properties?.some((property: EsTreeNode) => {
        const key = getStylePropertyKey(property);
        return key === "boxShadow";
      });

      if (!hasCustomFocusRing) {
        context.report({
          node: outlineProperty,
          message:
            "outline: none removes keyboard focus visibility - use :focus-visible styling instead, or provide a box-shadow focus ring",
        });
      }
    },
  }),
});
