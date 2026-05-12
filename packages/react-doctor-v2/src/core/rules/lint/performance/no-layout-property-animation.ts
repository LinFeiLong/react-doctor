import { defineRule } from "../../registry.js";
import {
  LAYOUT_PROPERTIES,
  MOTION_ANIMATE_PROPS,
  isMotionElement,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noLayoutPropertyAnimation = defineRule<Rule>({
  recommendation:
    "Animate transform, opacity, clip-path, or FLIP-derived transforms instead of layout properties like width, height, margin, top, or left.",
  examples: [
    {
      before: `transition: width 200ms;`,
      after: `transition: transform 200ms;`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || !MOTION_ANIMATE_PROPS.has(node.name.name))
        return;
      if (!node.value || !isNodeOfType(node.value, "JSXExpressionContainer")) return;
      if (isMotionElement(node)) return;

      const expression = node.value.expression;
      if (!isNodeOfType(expression, "ObjectExpression")) return;

      for (const property of expression.properties ?? []) {
        if (!isNodeOfType(property, "Property")) continue;
        let propertyName = null;
        if (isNodeOfType(property.key, "Identifier")) {
          propertyName = property.key.name;
        } else if (isNodeOfType(property.key, "Literal")) {
          propertyName = property.key.value;
        }

        if (propertyName && LAYOUT_PROPERTIES.has(propertyName)) {
          context.report({
            node: property,
            message: `Animating layout property "${propertyName}" triggers layout recalculation every frame - use transform/scale or the layout prop`,
          });
        }
      }
    },
  }),
});
