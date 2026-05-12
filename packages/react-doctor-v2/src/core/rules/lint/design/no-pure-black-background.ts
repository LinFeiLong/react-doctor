import { defineRule } from "../../registry.js";
import {
  getInlineStyleExpression,
  getStringFromClassNameAttr,
  getStylePropertyKey,
  getStylePropertyStringValue,
  isPureBlackColor,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noPureBlackBackground = defineRule<Rule>({
  recommendation:
    "Use near-black or tokenized dark surfaces instead of pure black so contrast and depth stay controlled.",
  examples: [
    {
      before: `<div className="bg-black" />`,
      after: `<div className="bg-neutral-950" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (key !== "backgroundColor" && key !== "background") continue;

        const value = getStylePropertyStringValue(property);
        if (value && isPureBlackColor(value)) {
          context.report({
            node: property,
            message:
              "Pure #000 background looks harsh - tint slightly toward your brand hue for a more refined feel (e.g. #0a0a0f)",
          });
        }
      }
    },
    JSXOpeningElement(node: EsTreeNode) {
      const classStr = getStringFromClassNameAttr(node);
      if (!classStr) return;

      if (/\bbg-black\b(?!\/)/.test(classStr)) {
        context.report({
          node,
          message:
            "Pure black background (bg-black) looks harsh - use a near-black tinted toward your brand hue (e.g. bg-gray-950)",
        });
      }
    },
  }),
});
