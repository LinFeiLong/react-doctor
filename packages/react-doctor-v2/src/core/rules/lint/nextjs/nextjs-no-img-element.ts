import { defineRule } from "../../registry.js";
import { OG_ROUTE_PATTERN, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsNoImgElement = defineRule<Rule>({
  recommendation:
    "Use next/image for images so sizing, optimization, lazy loading, and responsive formats are handled by Next.js.",
  examples: [
    {
      before: `<img src="/hero.png" alt="Hero" />`,
      after: `<Image src="/hero.png" alt="Hero" width={1200} height={800} />`,
    },
  ],
  create: (context: RuleContext) => {
    const filename = context.getFilename?.() ?? "";
    const isOgRoute = OG_ROUTE_PATTERN.test(filename);

    return {
      JSXOpeningElement(node: EsTreeNode) {
        if (isOgRoute) return;
        if (isNodeOfType(node.name, "JSXIdentifier") && node.name.name === "img") {
          context.report({
            node,
            message:
              "Use next/image instead of <img> - provides automatic optimization, lazy loading, and responsive srcset",
          });
        }
      },
    };
  },
});
