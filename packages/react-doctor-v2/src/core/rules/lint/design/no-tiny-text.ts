import { defineRule } from "../../registry.js";
import {
  TINY_TEXT_THRESHOLD_PX,
  getInlineStyleExpression,
  getStylePropertyKey,
  getStylePropertyNumberValue,
  getStylePropertyStringValue,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noTinyText = defineRule<Rule>({
  recommendation:
    "Keep body text and inputs at least 16px on mobile, stepping down only at larger breakpoints when appropriate.",
  examples: [
    {
      before: `<p style={{ fontSize: 12 }}>Details</p>`,
      after: `<p className="text-base sm:text-sm">Details</p>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (key !== "fontSize") continue;

        let pxValue: number | null = null;
        const numValue = getStylePropertyNumberValue(property);
        const strValue = getStylePropertyStringValue(property);

        if (numValue !== null) {
          pxValue = numValue;
        } else if (strValue !== null) {
          const pxMatch = strValue.match(/^([\d.]+)px$/);
          if (pxMatch) pxValue = parseFloat(pxMatch[1]);
          const remMatch = strValue.match(/^([\d.]+)rem$/);
          if (remMatch) pxValue = parseFloat(remMatch[1]) * 16;
        }

        if (pxValue !== null && pxValue > 0 && pxValue < TINY_TEXT_THRESHOLD_PX) {
          context.report({
            node: property,
            message: `Font size ${pxValue}px is too small - body text should be at least ${TINY_TEXT_THRESHOLD_PX}px for readability, 16px is ideal`,
          });
        }
      }
    },
  }),
});
