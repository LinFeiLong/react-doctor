import { defineRule } from "../../registry.js";
import {
  getInlineStyleExpression,
  getStylePropertyKey,
  getStylePropertyStringValue,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noJustifiedText = defineRule<Rule>({
  recommendation:
    "Use left-aligned text for body copy instead of text-align: justify to avoid rivers and uneven word spacing.",
  examples: [
    {
      before: `<p style={{ textAlign: "justify" }} />`,
      after: `<p className="text-left text-pretty" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      let isJustified = false;
      let hasHyphens = false;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        const value = getStylePropertyStringValue(property);
        if (!key || !value) continue;

        if (key === "textAlign" && value === "justify") isJustified = true;
        if ((key === "hyphens" || key === "WebkitHyphens") && value === "auto") hasHyphens = true;
      }

      if (isJustified && !hasHyphens) {
        context.report({
          node,
          message:
            'Justified text without hyphens creates uneven word spacing ("rivers of white"). Use text-align: left, or add hyphens: auto',
        });
      }
    },
  }),
});
