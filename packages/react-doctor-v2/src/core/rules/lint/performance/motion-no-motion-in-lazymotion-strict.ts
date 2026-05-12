import { defineRule } from "../../registry.js";
import { findJsxAttribute, isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

const isTruthyJsxAttribute = (attribute: EsTreeNode | undefined): boolean => {
  if (!attribute) return false;
  if (!attribute.value) return true;
  if (isNodeOfType(attribute.value, "Literal")) return attribute.value.value !== false;
  const expression = attribute.value.expression;
  if (isNodeOfType(expression, "Literal")) return expression.value !== false;
  return Boolean(expression);
};

const getJsxName = (node: EsTreeNode | undefined): string | null => {
  if (!node) return null;
  if (isNodeOfType(node, "JSXIdentifier")) return node.name;
  if (isNodeOfType(node, "JSXMemberExpression")) {
    const objectName = getJsxName(node.object);
    const propertyName = getJsxName(node.property);
    return objectName && propertyName ? `${objectName}.${propertyName}` : propertyName;
  }
  return null;
};

export const motionNoMotionInLazyMotionStrict = defineRule<Rule>({
  recommendation:
    "Inside LazyMotion strict mode, render motion elements through the lightweight m namespace so the full Motion feature bundle cannot leak back in.",
  examples: [
    {
      before: `<LazyMotion strict features={domAnimation}><motion.div animate={{ opacity: 1 }} /></LazyMotion>`,
      after: `<LazyMotion strict features={domAnimation}><m.div animate={{ opacity: 1 }} /></LazyMotion>`,
    },
  ],
  create: (context: RuleContext) => {
    let lazyMotionStrictDepth = 0;

    return {
      JSXElement(node: EsTreeNode) {
        const openingElement = node.openingElement;
        const elementName = getJsxName(openingElement?.name);
        if (elementName === "LazyMotion") {
          const strictAttribute = findJsxAttribute(openingElement.attributes ?? [], "strict");
          if (isTruthyJsxAttribute(strictAttribute)) lazyMotionStrictDepth++;
          return;
        }
        if (lazyMotionStrictDepth === 0) return;
        if (!elementName?.startsWith("motion.")) return;
        context.report({
          node: openingElement,
          message:
            "motion.* used inside <LazyMotion strict> - use m.* so strict mode can enforce the reduced bundle",
        });
      },
      "JSXElement:exit"(node: EsTreeNode) {
        const elementName = getJsxName(node.openingElement?.name);
        if (elementName !== "LazyMotion") return;
        const strictAttribute = findJsxAttribute(node.openingElement.attributes ?? [], "strict");
        if (isTruthyJsxAttribute(strictAttribute))
          lazyMotionStrictDepth = Math.max(0, lazyMotionStrictDepth - 1);
      },
    };
  },
});
