import { defineRule } from "../../registry.js";
import { findJsxAttribute, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsNoAElement = defineRule<Rule>({
  recommendation:
    "Use next/link for internal navigation so Next.js can prefetch and preserve client-side routing behavior.",
  examples: [
    {
      before: `<a href="/settings">Settings</a>`,
      after: `<Link href="/settings">Settings</Link>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "a") return;

      const hrefAttribute = findJsxAttribute(node.attributes ?? [], "href");
      if (!hrefAttribute?.value) return;

      let hrefValue = null;
      if (isNodeOfType(hrefAttribute.value, "Literal")) {
        hrefValue = hrefAttribute.value.value;
      } else if (
        isNodeOfType(hrefAttribute.value, "JSXExpressionContainer") &&
        isNodeOfType(hrefAttribute.value.expression, "Literal")
      ) {
        hrefValue = hrefAttribute.value.expression.value;
      }

      if (typeof hrefValue === "string" && hrefValue.startsWith("/")) {
        context.report({
          node,
          message:
            "Use next/link instead of <a> for internal links - enables client-side navigation and prefetching",
        });
      }
    },
  }),
});
