import { defineRule } from "../../registry.js";
import { MOTION_ANIMATE_PROPS, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const renderingAnimateSvgWrapper = defineRule<Rule>({
  recommendation:
    "Animate a wrapper element or SVG group with transform-box and transform-origin instead of transforming the bare SVG element.",
  examples: [
    {
      before: `<svg className="animate-spin" />`,
      after: `<div className="animate-spin"><svg /></div>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "svg") return;

      const hasAnimationProp = node.attributes?.some(
        (attribute: EsTreeNode) =>
          isNodeOfType(attribute, "JSXAttribute") &&
          isNodeOfType(attribute.name, "JSXIdentifier") &&
          MOTION_ANIMATE_PROPS.has(attribute.name.name),
      );

      if (hasAnimationProp) {
        context.report({
          node,
          message:
            "Animation props directly on <svg> - wrap in a <div> or <motion.div> for better rendering performance",
        });
      }
    },
  }),
});
