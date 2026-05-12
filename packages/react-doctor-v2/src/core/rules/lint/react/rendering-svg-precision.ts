import { defineRule } from "../../registry.js";
import { SVG_PATH_ATTRIBUTES, SVG_PATH_HIGH_PRECISION_PATTERN, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const renderingSvgPrecision = defineRule<Rule>({
  recommendation:
    "Round excessive SVG numeric precision to the smallest value that preserves visual quality and reduces markup size.",
  examples: [
    {
      before: `<path d="M 0.1234567 1.9876543" />`,
      after: `<path d="M 0.12 1.99" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier")) return;
      if (!SVG_PATH_ATTRIBUTES.has(node.name.name)) return;
      if (!isNodeOfType(node.value, "Literal")) return;
      const value = node.value.value;
      if (typeof value !== "string") return;
      if (!SVG_PATH_HIGH_PRECISION_PATTERN.test(value)) return;

      context.report({
        node,
        message: `SVG ${node.name.name} attribute uses 4+ decimal precision - truncate to 1-2 decimals to shrink markup with no visible difference`,
      });
    },
  }),
});
