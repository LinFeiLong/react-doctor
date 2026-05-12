import { defineRule } from "../../registry.js";
import { SCROLLVIEW_NAMES, resolveJsxElementName, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnNoScrollviewMappedList = defineRule<Rule>({
  recommendation:
    "Use FlatList, SectionList, or another virtualized list instead of mapping large lists inside ScrollView.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXElement(node: EsTreeNode) {
      const elementName = resolveJsxElementName(node.openingElement);
      if (!elementName || !SCROLLVIEW_NAMES.has(elementName)) return;

      for (const child of node.children ?? []) {
        if (!isNodeOfType(child, "JSXExpressionContainer")) continue;
        const expression = child.expression;
        if (
          isNodeOfType(expression, "CallExpression") &&
          isNodeOfType(expression.callee, "MemberExpression") &&
          isNodeOfType(expression.callee.property, "Identifier") &&
          expression.callee.property.name === "map"
        ) {
          context.report({
            node: child,
            message: `<${elementName}> rendering items.map(...) - use FlashList, LegendList, or FlatList so only visible rows mount`,
          });
          return;
        }
      }
    },
  }),
});
