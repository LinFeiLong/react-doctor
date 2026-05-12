import { defineRule } from "../../registry.js";
import {
  NONDETERMINISTIC_RENDER_PATTERNS,
  findOpeningElementOfChild,
  hasSuppressHydrationWarningAttribute,
  walkAst,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const renderingHydrationMismatchTime = defineRule<Rule>({
  recommendation:
    "Move time, random, locale, and browser-only values to client-only state or render a stable server placeholder; do not silence real mismatches with suppressHydrationWarning.",
  examples: [
    {
      before: `<span>{new Date().toLocaleString()}</span>`,
      after: `<ClientTime />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXExpressionContainer(node: EsTreeNode) {
      if (!node.expression) return;
      const matched = NONDETERMINISTIC_RENDER_PATTERNS.find((pattern) =>
        pattern.matches(node.expression),
      );
      // Direct call as the JSX child expression.
      if (matched) {
        const openingElement = findOpeningElementOfChild(node);
        if (hasSuppressHydrationWarningAttribute(openingElement)) return;
        context.report({
          node,
          message: `${matched.display} in JSX renders differently on server vs client - move it to client-only state or render a stable server placeholder instead of silencing the mismatch`,
        });
        return;
      }

      // Method-chained on a Date / Math / etc. - e.g. new Date().toLocaleString().
      walkAst(node.expression, (child: EsTreeNode) => {
        for (const pattern of NONDETERMINISTIC_RENDER_PATTERNS) {
          if (pattern.matches(child)) {
            const openingElement = findOpeningElementOfChild(node);
            if (hasSuppressHydrationWarningAttribute(openingElement)) return;
            context.report({
              node: child,
              message: `${pattern.display} reachable from JSX renders differently on server vs client - move it to client-only state or render a stable server placeholder instead of silencing the mismatch`,
            });
            return;
          }
        }
      });
    },
  }),
});
