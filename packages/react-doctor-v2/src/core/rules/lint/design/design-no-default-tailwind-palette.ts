import { defineRule } from "../../registry.js";
import { DEFAULT_PALETTE_REGEX, getClassNameLiteral, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noDefaultTailwindPalette = defineRule<Rule>({
  recommendation:
    "Replace default gray/slate/zinc-heavy palettes with project tokens or a deliberate brand palette.",
  examples: [
    {
      before: `<button className="bg-indigo-600 text-white" />`,
      after: `<button className="bg-brand text-brand-foreground" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(jsxAttribute: EsTreeNode) {
      if (
        !isNodeOfType(jsxAttribute.name, "JSXIdentifier") ||
        jsxAttribute.name.name !== "className"
      ) {
        return;
      }
      const classNameLiteral = getClassNameLiteral(jsxAttribute);
      if (!classNameLiteral) return;
      const reportedTokens = new Set<string>();
      for (const paletteMatch of classNameLiteral.matchAll(DEFAULT_PALETTE_REGEX)) {
        const matchedToken = `${paletteMatch[1]}-${paletteMatch[2]}-${paletteMatch[3]}`;
        if (reportedTokens.has(matchedToken)) continue;
        reportedTokens.add(matchedToken);
        const replacementSuggestion =
          paletteMatch[2] === "indigo"
            ? "use your project's brand color or zinc/neutral/stone"
            : "use zinc (true neutral), neutral (warmer), or stone (warmest)";
        context.report({
          node: jsxAttribute,
          message: `${matchedToken} reads as the Tailwind template default - ${replacementSuggestion}`,
        });
      }
    },
  }),
});
