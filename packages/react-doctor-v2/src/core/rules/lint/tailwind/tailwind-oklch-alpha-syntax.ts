import { defineRule } from "../../registry.js";
import { getLiteralString } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const COMMA_ALPHA_OKLCH_PATTERN = /oklch\([^)]*,\s*(?:0?\.\d+|1(?:\.0+)?)\)/i;

export const tailwindOklchAlphaSyntax = defineRule<Rule>({
  recommendation:
    "Write OKLCH alpha with slash syntax such as oklch(0.7 0.12 240 / 0.5); comma alpha is invalid CSS and will not render reliably.",
  examples: [
    {
      before: `style={{ color: "oklch(0.7 0.12 240, 0.5)" }}`,
      after: `style={{ color: "oklch(0.7 0.12 240 / 0.5)" }}`,
    },
  ],
  create: (context: RuleContext) => ({
    Literal(node: EsTreeNode) {
      const value = getLiteralString(node);
      if (!value || !COMMA_ALPHA_OKLCH_PATTERN.test(value)) return;
      context.report({
        node,
        message: "OKLCH color uses comma alpha syntax - use slash alpha syntax instead",
      });
    },
    TemplateLiteral(node: EsTreeNode) {
      const value = getLiteralString(node);
      if (!value || !COMMA_ALPHA_OKLCH_PATTERN.test(value)) return;
      context.report({
        node,
        message: "OKLCH color uses comma alpha syntax - use slash alpha syntax instead",
      });
    },
  }),
});
