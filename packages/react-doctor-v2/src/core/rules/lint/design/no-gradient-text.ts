import { defineRule } from "../../registry.js";
import {
  getInlineStyleExpression,
  getStringFromClassNameAttr,
  getStylePropertyKey,
  getStylePropertyStringValue,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noGradientText = defineRule<Rule>({
  recommendation:
    "Use solid text color for important copy and reserve gradients for decorative accents with accessible fallbacks.",
  examples: [
    {
      before: `<h1 className="bg-gradient-to-r text-transparent bg-clip-text" />`,
      after: `<h1 className="text-foreground" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      let hasBackgroundClipText = false;
      let hasGradientBackground = false;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        const value = getStylePropertyStringValue(property);
        if (!key || !value) continue;

        if ((key === "backgroundClip" || key === "WebkitBackgroundClip") && value === "text") {
          hasBackgroundClipText = true;
        }
        if ((key === "backgroundImage" || key === "background") && value.includes("gradient")) {
          hasGradientBackground = true;
        }
      }

      if (hasBackgroundClipText && hasGradientBackground) {
        context.report({
          node,
          message:
            "Gradient text (background-clip: text) is decorative rather than meaningful - a common AI tell. Use solid colors for text",
        });
      }
    },
    JSXOpeningElement(node: EsTreeNode) {
      const classStr = getStringFromClassNameAttr(node);
      if (!classStr) return;

      if (/\bbg-clip-text\b/.test(classStr) && /\bbg-gradient-to-/.test(classStr)) {
        context.report({
          node,
          message:
            "Gradient text (bg-clip-text + bg-gradient) is decorative rather than meaningful - a common AI tell. Use solid colors for text",
        });
      }
    },
  }),
});
