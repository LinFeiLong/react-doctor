import { defineRule } from "../../registry.js";
import {
  PADDING_HORIZONTAL_AXIS_PATTERN,
  PADDING_VERTICAL_AXIS_PATTERN,
  collectAxisShorthandPairs,
  getClassNameLiteral,
  hasResponsivePrefix,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noRedundantPaddingAxes = defineRule<Rule>({
  recommendation:
    "Use the shorthand padding utility for matching axes or remove duplicate axis utilities.",
  examples: [
    {
      before: `<div className="px-4 py-4" />`,
      after: `<div className="p-4" />`,
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
      // Per-breakpoint variation is a legit reason to keep the axes split.
      if (
        hasResponsivePrefix(classNameLiteral, "px") ||
        hasResponsivePrefix(classNameLiteral, "py")
      ) {
        return;
      }
      const matchedPairs = collectAxisShorthandPairs(
        classNameLiteral,
        PADDING_HORIZONTAL_AXIS_PATTERN,
        PADDING_VERTICAL_AXIS_PATTERN,
      );
      if (matchedPairs.length === 0) return;

      for (const matchedPair of matchedPairs) {
        context.report({
          node: jsxAttribute,
          message: `px-${matchedPair.value} py-${matchedPair.value} → use the shorthand p-${matchedPair.value}`,
        });
      }
    },
  }),
});
