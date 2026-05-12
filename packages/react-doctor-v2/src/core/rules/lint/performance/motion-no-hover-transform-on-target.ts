import { defineRule } from "../../registry.js";
import { getStringFromClassNameAttr } from "../design/_utils.js";
import { findJsxAttribute, isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

const HOVER_TARGET_TRANSFORM_PATTERN = /(?:^|\s)hover:(?:-?translate-[xy]|scale|rotate)-/;

const getJsxElementName = (openingElement: EsTreeNode): string | null => {
  if (isNodeOfType(openingElement.name, "JSXIdentifier")) return openingElement.name.name;
  if (
    isNodeOfType(openingElement.name, "JSXMemberExpression") &&
    isNodeOfType(openingElement.name.property, "JSXIdentifier")
  ) {
    return openingElement.name.property.name;
  }
  return null;
};

const isInteractiveOrCardLike = (openingElement: EsTreeNode, classNameValue: string): boolean => {
  const elementName = getJsxElementName(openingElement);
  if (
    elementName === "button" ||
    elementName === "a" ||
    elementName === "Button" ||
    elementName === "Card"
  ) {
    return true;
  }
  if (findJsxAttribute(openingElement.attributes ?? [], "onClick")) return true;
  return /(?:^|\s)(?:cursor-pointer|rounded|border|shadow|ring-|bg-card)(?:\s|$)/.test(
    classNameValue,
  );
};

export const motionNoHoverTransformOnTarget = defineRule<Rule>({
  recommendation:
    "Do not move the hovered hit target itself with hover:translate, hover:scale, or hover:rotate; keep the target stationary and animate a child with group-hover.",
  examples: [
    {
      before: `<button className="hover:scale-105 transition-transform">Open</button>`,
      after: `<button className="group"><span className="transition-transform group-hover:scale-105">Open</span></button>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const classAttribute = findJsxAttribute(node.attributes ?? [], "className");
      if (!classAttribute) return;
      const classNameValue = getStringFromClassNameAttr(node);
      if (!classNameValue || !HOVER_TARGET_TRANSFORM_PATTERN.test(classNameValue)) return;
      if (!isInteractiveOrCardLike(node, classNameValue)) return;
      context.report({
        node: classAttribute,
        message:
          "hover transform moves the pointer target and can cause flicker - keep the target stationary and animate a child with group-hover",
      });
    },
  }),
});
