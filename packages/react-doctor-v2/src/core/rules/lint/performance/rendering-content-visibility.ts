import { defineRule } from "../../registry.js";
const LIST_RENDER_METHODS = new Set(["map", "flatMap"]);
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const hasContentVisibilityStyle = (node: EsTreeNode): boolean => {
  for (const attribute of node.attributes ?? []) {
    if (!isNodeOfType(attribute, "JSXAttribute")) continue;
    if (!isNodeOfType(attribute.name, "JSXIdentifier") || attribute.name.name !== "style") continue;
    if (!isNodeOfType(attribute.value, "JSXExpressionContainer")) continue;
    const expression = attribute.value.expression;
    if (!isNodeOfType(expression, "ObjectExpression")) continue;
    for (const property of expression.properties ?? []) {
      if (!isNodeOfType(property, "Property")) continue;
      const key = property.key;
      if (isNodeOfType(key, "Identifier") && key.name === "contentVisibility") return true;
      if (isNodeOfType(key, "Literal") && key.value === "contentVisibility") return true;
    }
  }
  return false;
};

export const renderingContentVisibility = defineRule<Rule>({
  recommendation:
    "Add content-visibility and contain-intrinsic-size to long off-screen sections, or virtualize very large lists.",
  examples: [
    {
      before: `{items.map((item) => <article>{item.title}</article>)}`,
      after: `{items.map((item) => <article style={{ contentVisibility: "auto", containIntrinsicSize: "200px" }}>{item.title}</article>)}`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;
      if (!isNodeOfType(node.callee.property, "Identifier")) return;
      if (!LIST_RENDER_METHODS.has(node.callee.property.name)) return;
      const callback = node.arguments?.[0];
      const body = callback?.body;
      const jsxElement = isNodeOfType(body, "JSXElement") ? body : null;
      if (!jsxElement) return;
      const openingElement = jsxElement.openingElement;
      if (hasContentVisibilityStyle(openingElement)) return;
      context.report({
        node: openingElement,
        message:
          "large mapped list item lacks content-visibility hints - add contentVisibility: 'auto' / containIntrinsicSize or virtualize the list to defer off-screen work",
      });
    },
  }),
});
