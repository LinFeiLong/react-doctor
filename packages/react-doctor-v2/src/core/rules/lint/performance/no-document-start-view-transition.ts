import { defineRule } from "../../registry.js";
import { isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

export const noDocumentStartViewTransition = defineRule<Rule>({
  recommendation:
    "Start view transitions from user-triggered navigation or state changes instead of calling document.startViewTransition during render or mount.",
  examples: [
    {
      before: `document.startViewTransition(() => setOpen(true));`,
      after: `button.onclick = () => document.startViewTransition(() => setOpen(true));`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const callee = node.callee;
      if (!isNodeOfType(callee, "MemberExpression")) return;
      if (!isNodeOfType(callee.object, "Identifier") || callee.object.name !== "document") return;
      if (
        !isNodeOfType(callee.property, "Identifier") ||
        callee.property.name !== "startViewTransition"
      )
        return;
      context.report({
        node,
        message:
          "document.startViewTransition() bypasses React's <ViewTransition> integration - render a <ViewTransition> component and let React drive the transition (around startTransition / useDeferredValue / Suspense)",
      });
    },
  }),
});
