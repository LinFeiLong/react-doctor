import { defineRule } from "../../registry.js";
import { GOOGLE_FONTS_PATTERN, findJsxAttribute, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsNoCssLink = defineRule<Rule>({
  recommendation:
    "Import CSS through Next.js-supported CSS files or modules instead of adding stylesheet link tags in components.",
  examples: [
    {
      before: `<link rel="stylesheet" href="/styles.css" />`,
      after: `import "./styles.css";`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "link") return;
      const attributes = node.attributes ?? [];

      const relAttribute = findJsxAttribute(attributes, "rel");
      if (!relAttribute?.value) return;
      const relValue = isNodeOfType(relAttribute.value, "Literal")
        ? relAttribute.value.value
        : null;
      if (relValue !== "stylesheet") return;

      const hrefAttribute = findJsxAttribute(attributes, "href");
      if (!hrefAttribute?.value) return;
      const hrefValue = isNodeOfType(hrefAttribute.value, "Literal")
        ? hrefAttribute.value.value
        : null;
      if (typeof hrefValue === "string" && GOOGLE_FONTS_PATTERN.test(hrefValue)) return;

      context.report({
        node,
        message: '<link rel="stylesheet"> tag - import CSS directly for bundling and optimization',
      });
    },
  }),
});
