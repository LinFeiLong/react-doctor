import { defineRule } from "../../registry.js";
import {
  SCROLLVIEW_NAMES,
  SCROLLVIEW_STYLE_PADDING_KEYS,
  resolveJsxElementName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const reportPaddingProperty = (
  property: EsTreeNode,
  scrollViewName: string,
  context: RuleContext,
): void => {
  const key = property.key;
  const propertyName = isNodeOfType(key, "Identifier")
    ? key.name
    : isNodeOfType(key, "Literal")
      ? String(key.value)
      : null;
  if (!propertyName || !SCROLLVIEW_STYLE_PADDING_KEYS.has(propertyName)) return;
  context.report({
    node: property,
    message: `${scrollViewName} style uses ${propertyName} - put scroll content spacing in contentContainerStyle so padding does not clip or offset the native scroll container`,
  });
};

const inspectStyleExpression = (
  expression: EsTreeNode | null | undefined,
  scrollViewName: string,
  context: RuleContext,
): void => {
  if (isNodeOfType(expression, "ObjectExpression")) {
    for (const property of expression.properties ?? []) {
      if (isNodeOfType(property, "Property"))
        reportPaddingProperty(property, scrollViewName, context);
    }
    return;
  }
  if (!isNodeOfType(expression, "ArrayExpression")) return;
  for (const element of expression.elements ?? []) {
    if (!isNodeOfType(element, "ObjectExpression")) continue;
    inspectStyleExpression(element, scrollViewName, context);
  }
};

export const rnScrollviewContentContainerPadding = defineRule<Rule>({
  recommendation:
    "Put ScrollView spacing on contentContainerStyle, not style, so padding applies to the scroll content instead of the native scroll viewport.",
  examples: [
    {
      before: `<ScrollView style={{ padding: 16 }}>`,
      after: `<ScrollView contentContainerStyle={{ padding: 16 }}>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const elementName = resolveJsxElementName(node);
      if (!elementName || !SCROLLVIEW_NAMES.has(elementName)) return;
      for (const attribute of node.attributes ?? []) {
        if (!isNodeOfType(attribute, "JSXAttribute")) continue;
        if (!isNodeOfType(attribute.name, "JSXIdentifier") || attribute.name.name !== "style")
          continue;
        if (!isNodeOfType(attribute.value, "JSXExpressionContainer")) continue;
        inspectStyleExpression(attribute.value.expression, elementName, context);
      }
    },
  }),
});
