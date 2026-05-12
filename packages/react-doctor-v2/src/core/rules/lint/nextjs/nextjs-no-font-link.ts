import { defineRule } from "../../registry.js";
import { GOOGLE_FONTS_PATTERN, findJsxAttribute, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsNoFontLink = defineRule<Rule>({
  recommendation:
    "Use next/font for local or Google fonts instead of link tags so fonts are optimized and self-hosted.",
  examples: [
    {
      before: `<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet" />`,
      after: `const inter = Inter({ subsets: ["latin"] });`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "link") return;
      const attributes = node.attributes ?? [];

      const hrefAttribute = findJsxAttribute(attributes, "href");
      if (!hrefAttribute?.value) return;

      const hrefValue = isNodeOfType(hrefAttribute.value, "Literal")
        ? hrefAttribute.value.value
        : null;

      if (typeof hrefValue === "string" && GOOGLE_FONTS_PATTERN.test(hrefValue)) {
        context.report({
          node,
          message:
            "Loading Google Fonts via <link> - use next/font instead for self-hosting, zero layout shift, and no render-blocking requests",
        });
      }
    },
  }),
});
