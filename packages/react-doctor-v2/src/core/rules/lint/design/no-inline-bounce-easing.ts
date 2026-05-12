import { defineRule } from "../../registry.js";
import {
  getInlineStyleExpression,
  getStringFromClassNameAttr,
  getStylePropertyKey,
  getStylePropertyStringValue,
  hasBounceAnimationName,
  isOvershootCubicBezier,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noInlineBounceEasing = defineRule<Rule>({
  recommendation:
    "Move easing curves into named tokens and use restrained spring or cubic-bezier values instead of inline bounce curves.",
  examples: [
    {
      before: `transitionTimingFunction: "cubic-bezier(.68,-.55,.27,1.55)"`,
      after: `className="transition-transform ease-out"`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (!key) continue;

        const value = getStylePropertyStringValue(property);
        if (!value) continue;

        if (
          (key === "transition" ||
            key === "transitionTimingFunction" ||
            key === "animation" ||
            key === "animationTimingFunction") &&
          isOvershootCubicBezier(value)
        ) {
          context.report({
            node: property,
            message:
              "Bounce/elastic easing feels dated - real objects decelerate smoothly. Use ease-out or cubic-bezier(0.16, 1, 0.3, 1) instead",
          });
        }

        if ((key === "animation" || key === "animationName") && hasBounceAnimationName(value)) {
          context.report({
            node: property,
            message:
              "Bounce/elastic animation name detected - these feel tacky. Use exponential easing (ease-out-quart/expo) for natural deceleration",
          });
        }
      }
    },
    JSXOpeningElement(node: EsTreeNode) {
      const classStr = getStringFromClassNameAttr(node);
      if (!classStr) return;

      if (/\banimate-bounce\b/.test(classStr)) {
        context.report({
          node,
          message:
            "animate-bounce feels dated and tacky - use a subtle ease-out transform for natural deceleration",
        });
      }
    },
  }),
});
