import { defineRule } from "../../registry.js";
import { SCROLLVIEW_NAMES, resolveJsxElementName, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnScrollviewDynamicPadding = defineRule<Rule>({
  recommendation:
    "Keep ScrollView padding stable or express inset changes with contentContainerStyle and safe-area APIs to avoid layout jumps.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const elementName = resolveJsxElementName(node);
      if (!elementName) return;
      if (
        !SCROLLVIEW_NAMES.has(elementName) &&
        elementName !== "FlatList" &&
        elementName !== "FlashList"
      )
        return;

      for (const attribute of node.attributes ?? []) {
        if (!isNodeOfType(attribute, "JSXAttribute")) continue;
        if (
          !isNodeOfType(attribute.name, "JSXIdentifier") ||
          attribute.name.name !== "contentContainerStyle"
        )
          continue;
        if (!isNodeOfType(attribute.value, "JSXExpressionContainer")) continue;
        const expression = attribute.value.expression;
        if (!isNodeOfType(expression, "ObjectExpression")) continue;

        for (const property of expression.properties ?? []) {
          if (!isNodeOfType(property, "Property")) continue;
          if (!isNodeOfType(property.key, "Identifier")) continue;
          const key = property.key.name;
          if (key !== "paddingBottom" && key !== "paddingTop") continue;
          // Static numeric value is fine - only flag dynamic identifiers /
          // member expressions that change between renders.
          const value = property.value;
          if (!value) continue;
          if (isNodeOfType(value, "Literal")) continue;

          context.report({
            node: property,
            message: `Dynamic ${key} on contentContainerStyle reflows the scroll content - use \`contentInset\` (OS-level offset, no relayout) instead`,
          });
          return;
        }
      }
    },
  }),
});
