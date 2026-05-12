import { defineRule } from "../../registry.js";
import { VIRTUALIZED_LIST_NAMES, resolveJsxElementName, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnListDataMapped = defineRule<Rule>({
  recommendation:
    "Pass raw data to virtualized lists and transform items in renderItem or memoized selectors instead of mapping data inline.",
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
      if (!elementName || !VIRTUALIZED_LIST_NAMES.has(elementName)) return;

      for (const attribute of node.attributes ?? []) {
        if (!isNodeOfType(attribute, "JSXAttribute")) continue;
        if (!isNodeOfType(attribute.name, "JSXIdentifier") || attribute.name.name !== "data")
          continue;
        if (!isNodeOfType(attribute.value, "JSXExpressionContainer")) continue;
        const expression = attribute.value.expression;
        if (!isNodeOfType(expression, "CallExpression")) continue;
        if (!isNodeOfType(expression.callee, "MemberExpression")) continue;
        if (!isNodeOfType(expression.callee.property, "Identifier")) continue;
        const methodName = expression.callee.property.name;
        if (methodName !== "map" && methodName !== "filter") continue;

        context.report({
          node: attribute,
          message: `<${elementName} data={items.${methodName}(...)}> allocates a fresh array per render - wrap in useMemo at list scope so the data reference stays stable across parent renders`,
        });
        return;
      }
    },
  }),
});
