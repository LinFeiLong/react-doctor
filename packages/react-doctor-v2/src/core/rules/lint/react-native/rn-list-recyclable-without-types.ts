import { defineRule } from "../../registry.js";
import { RECYCLABLE_LIST_NAMES, resolveJsxElementName, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnListRecyclableWithoutTypes = defineRule<Rule>({
  recommendation:
    "Provide stable item types or getItemType for recyclable lists so cells can be reused correctly.",
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
      if (!elementName || !RECYCLABLE_LIST_NAMES.has(elementName)) return;

      let hasRecycleItemsEnabled = false;
      let hasGetItemType = false;

      for (const attribute of node.attributes ?? []) {
        if (!isNodeOfType(attribute, "JSXAttribute")) continue;
        if (!isNodeOfType(attribute.name, "JSXIdentifier")) continue;
        if (attribute.name.name === "recycleItems") {
          if (!attribute.value) {
            hasRecycleItemsEnabled = true;
          } else if (
            isNodeOfType(attribute.value, "JSXExpressionContainer") &&
            isNodeOfType(attribute.value.expression, "Literal")
          ) {
            hasRecycleItemsEnabled = attribute.value.expression.value === true;
          } else {
            hasRecycleItemsEnabled = true;
          }
        }
        if (attribute.name.name === "getItemType") hasGetItemType = true;
      }

      if (hasRecycleItemsEnabled && !hasGetItemType) {
        context.report({
          node,
          message: `<${elementName} recycleItems> without \`getItemType\` - heterogeneous rows mount into the wrong recycled cells. Add \`getItemType={item => item.kind}\` so FlashList keeps separate recycle pools per type`,
        });
      }
    },
  }),
});
