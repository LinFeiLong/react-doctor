import { defineRule } from "../../registry.js";
import {
  SIZE_HEIGHT_AXIS_PATTERN,
  SIZE_WIDTH_AXIS_PATTERN,
  collectAxisShorthandPairs,
  getClassNameLiteral,
  hasResponsivePrefix,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noRedundantSizeAxes = defineRule<Rule>({
  recommendation:
    "Use size-* when width and height match, or keep only the axis utility that actually differs.",
  examples: [
    {
      before: `<div className="h-6 w-6" />`,
      after: `<div className="size-6" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(jsxAttribute: EsTreeNode) {
      if (
        !isNodeOfType(jsxAttribute.name, "JSXIdentifier") ||
        jsxAttribute.name.name !== "className"
      ) {
        return;
      }
      const classNameLiteral = getClassNameLiteral(jsxAttribute);
      if (!classNameLiteral) return;
      if (
        hasResponsivePrefix(classNameLiteral, "w") ||
        hasResponsivePrefix(classNameLiteral, "h")
      ) {
        return;
      }
      // Skip percent / fraction widths (`w-1/2 h-1/2`) - those have no `size-*` shorthand.
      const matchedPairs = collectAxisShorthandPairs(
        classNameLiteral,
        SIZE_WIDTH_AXIS_PATTERN,
        SIZE_HEIGHT_AXIS_PATTERN,
      );
      if (matchedPairs.length === 0) return;

      for (const matchedPair of matchedPairs) {
        context.report({
          node: jsxAttribute,
          message: `w-${matchedPair.value} h-${matchedPair.value} → use the shorthand size-${matchedPair.value} (Tailwind v3.4+)`,
        });
      }
    },
  }),
});
