import { defineRule } from "../../registry.js";
import {
  getInlineStyleExpression,
  getStylePropertyKey,
  getStylePropertyStringValue,
  hasColoredGlowShadow,
  isBackgroundDark,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noDarkModeGlow = defineRule<Rule>({
  recommendation:
    "Reduce or remove decorative glows in dark mode and rely on contrast, elevation, and spacing for hierarchy.",
  examples: [
    {
      before: `<div className="dark:shadow-[0_0_80px_blue]" />`,
      after: `<div className="dark:ring-1 dark:ring-white/10" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      let hasDarkBackground = false;
      let shadowProperty: EsTreeNode | null = null;
      let shadowValue: string | null = null;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (!key) continue;

        if (key === "backgroundColor" || key === "background") {
          const value = getStylePropertyStringValue(property);
          if (value && isBackgroundDark(value)) {
            hasDarkBackground = true;
          }
        }

        if (key === "boxShadow") {
          shadowProperty = property;
          shadowValue = getStylePropertyStringValue(property);
        }
      }

      if (!hasDarkBackground || !shadowValue || !shadowProperty) return;

      if (hasColoredGlowShadow(shadowValue)) {
        context.report({
          node: shadowProperty,
          message:
            "Colored glow on dark background - the default AI-generated 'cool' look. Use subtle, purposeful lighting instead",
        });
      }
    },
  }),
});
