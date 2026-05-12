import { defineRule } from "../../registry.js";
import { TRAILING_THREE_PERIOD_ELLIPSIS_PATTERN, isInsideExcludedAncestor } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noThreePeriodEllipsis = defineRule<Rule>({
  recommendation:
    "Use the single ellipsis character or clearer loading/status copy instead of three periods.",
  examples: [
    {
      before: `<span>Loading...</span>`,
      after: `<span>Loading…</span>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXText(jsxTextNode: EsTreeNode) {
      const textValue = typeof jsxTextNode.value === "string" ? jsxTextNode.value : "";
      if (!TRAILING_THREE_PERIOD_ELLIPSIS_PATTERN.test(textValue)) return;
      if (isInsideExcludedAncestor(jsxTextNode)) return;
      context.report({
        node: jsxTextNode,
        message:
          'Three-period ellipsis ("...") in JSX text - use the actual ellipsis character "…" (or `&hellip;`)',
      });
    },
  }),
});
