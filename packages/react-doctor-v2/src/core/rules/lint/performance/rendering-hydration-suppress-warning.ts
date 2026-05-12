import { defineRule } from "../../registry.js";
import {
  NONDETERMINISTIC_RENDER_PATTERNS,
  hasSuppressHydrationWarningAttribute,
  walkAst,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const renderingHydrationSuppressWarning = defineRule<Rule>({
  recommendation:
    "Do not use suppressHydrationWarning to hide real nondeterminism; move time, random, locale, and browser-only values to a client-only boundary or render a stable server placeholder.",
  examples: [
    {
      before: `<span suppressHydrationWarning>{Date.now()}</span>`,
      after: `<ClientTime />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXElement(node: EsTreeNode) {
      const openingElement = node.openingElement;
      if (!hasSuppressHydrationWarningAttribute(openingElement)) return;
      let matchedDisplay: string | null = null;
      walkAst(node, (child: EsTreeNode) => {
        if (matchedDisplay) return false;
        for (const pattern of NONDETERMINISTIC_RENDER_PATTERNS) {
          if (pattern.matches(child)) {
            matchedDisplay = pattern.display;
            return false;
          }
        }
      });
      if (!matchedDisplay) return;
      context.report({
        node: openingElement,
        message: `suppressHydrationWarning hides ${matchedDisplay}, but the server HTML is still nondeterministic - move the value to a client-only boundary or render a stable placeholder`,
      });
    },
  }),
});
