import { defineRule } from "../../registry.js";
import { hasJsxAttribute, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsImageMissingSizes = defineRule<Rule>({
  recommendation:
    "Provide width and height or fill plus sizes on Next.js images so layout and responsive image selection are stable.",
  examples: [
    {
      before: `<Image src="/hero.png" alt="Hero" />`,
      after: `<Image src="/hero.png" alt="Hero" width={1200} height={800} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "Image") return;
      const attributes = node.attributes ?? [];
      if (!hasJsxAttribute(attributes, "fill")) return;
      if (hasJsxAttribute(attributes, "sizes")) return;

      context.report({
        node,
        message:
          "next/image with fill but no sizes - the browser downloads the largest image. Add a sizes attribute for responsive behavior",
      });
    },
  }),
});
