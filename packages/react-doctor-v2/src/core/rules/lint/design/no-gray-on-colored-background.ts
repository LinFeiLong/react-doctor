import { defineRule } from "../../registry.js";
import { getStringFromClassNameAttr } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noGrayOnColoredBackground = defineRule<Rule>({
  recommendation:
    "Use foreground colors chosen for the colored surface instead of gray text that loses contrast on tinted backgrounds.",
  examples: [
    {
      before: `<div className="bg-blue-600 text-gray-500" />`,
      after: `<div className="bg-blue-600 text-white" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const classStr = getStringFromClassNameAttr(node);
      if (!classStr) return;

      const grayTextMatch = classStr.match(/\btext-(?:gray|slate|zinc|neutral|stone)-\d+\b/);
      const coloredBgMatch = classStr.match(
        /\bbg-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+\b/,
      );

      if (grayTextMatch && coloredBgMatch) {
        context.report({
          node,
          message: `Gray text (${grayTextMatch[0]}) on colored background (${coloredBgMatch[0]}) looks washed out - use a darker shade of the background color or white`,
        });
      }
    },
  }),
});
