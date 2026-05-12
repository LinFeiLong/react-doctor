import { defineRule } from "../../registry.js";
import {
  BLUR_VALUE_PATTERN,
  LARGE_BLUR_THRESHOLD_PX,
  MOTION_ANIMATE_PROPS,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noLargeAnimatedBlur = defineRule<Rule>({
  recommendation:
    "Avoid animating large blur or filter values; use opacity, transform, or a pre-rendered asset for the effect.",
  examples: [
    {
      before: `filter: blur(80px); transition: filter 300ms;`,
      after: `opacity: 0.8; transform: scale(1.02);`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier")) return;
      if (node.name.name !== "style" && !MOTION_ANIMATE_PROPS.has(node.name.name)) return;
      if (!isNodeOfType(node.value, "JSXExpressionContainer")) return;

      const expression = node.value.expression;
      if (!isNodeOfType(expression, "ObjectExpression")) return;

      for (const property of expression.properties ?? []) {
        if (!isNodeOfType(property, "Property")) continue;
        const key = isNodeOfType(property.key, "Identifier") ? property.key.name : null;
        if (key !== "filter" && key !== "backdropFilter" && key !== "WebkitBackdropFilter")
          continue;
        if (!isNodeOfType(property.value, "Literal") || typeof property.value.value !== "string")
          continue;

        const match = BLUR_VALUE_PATTERN.exec(property.value.value);
        if (!match) continue;

        const blurRadius = Number.parseFloat(match[1]);
        if (blurRadius > LARGE_BLUR_THRESHOLD_PX) {
          context.report({
            node: property,
            message: `blur(${blurRadius}px) is expensive - cost escalates with radius and layer size, can exceed GPU memory on mobile`,
          });
        }
      }
    },
  }),
});
