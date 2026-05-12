import { defineRule } from "../../registry.js";
import {
  getInlineStyleExpression,
  getStylePropertyKey,
  getStylePropertyStringValue,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noLayoutTransitionInline = defineRule<Rule>({
  recommendation:
    "Transition transform and opacity explicitly instead of inline layout-property transitions.",
  examples: [
    {
      before: `<div style={{ transition: "width 200ms" }} />`,
      after: `<div style={{ transition: "transform 200ms" }} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (key !== "transition" && key !== "transitionProperty") continue;

        const value = getStylePropertyStringValue(property);
        if (!value) continue;

        const lower = value.toLowerCase();
        if (/\ball\b/.test(lower)) continue;

        const layoutMatch = lower.match(
          /\b(?:(?:max|min)-)?(?:width|height)\b|\bpadding(?:-(?:top|right|bottom|left))?\b|\bmargin(?:-(?:top|right|bottom|left))?\b/,
        );
        if (layoutMatch) {
          context.report({
            node: property,
            message: `Transitioning layout property "${layoutMatch[0]}" causes layout thrash every frame - use transform and opacity instead`,
          });
        }
      }
    },
  }),
});
