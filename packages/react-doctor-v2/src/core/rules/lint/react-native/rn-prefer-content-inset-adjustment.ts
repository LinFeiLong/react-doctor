import { defineRule } from "../../registry.js";
import { SCROLLVIEW_NAMES, resolveJsxElementName, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnPreferContentInsetAdjustment = defineRule<Rule>({
  recommendation:
    "Use contentInsetAdjustmentBehavior or SafeArea-aware containers instead of manually padding scroll content for device insets.",
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
      if (elementName !== "SafeAreaView") return;

      for (const child of node.children ?? []) {
        if (!isNodeOfType(child, "JSXElement")) continue;
        const childName = resolveJsxElementName(child.openingElement);
        if (!childName || !SCROLLVIEW_NAMES.has(childName)) continue;

        context.report({
          node,
          message:
            '<SafeAreaView> wrapping <ScrollView> - set `contentInsetAdjustmentBehavior="automatic"` on the ScrollView and drop the SafeAreaView wrapper for native safe-area handling',
        });
        return;
      }
    },
  }),
});
