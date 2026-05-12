import { defineRule } from "../../registry.js";
import { isMemberProperty, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnNoDimensionsGet = defineRule<Rule>({
  recommendation:
    "Use useWindowDimensions or a subscribed dimensions hook so layout updates when screen size changes.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;
      if (
        !isNodeOfType(node.callee.object, "Identifier") ||
        node.callee.object.name !== "Dimensions"
      )
        return;

      if (isMemberProperty(node.callee, "get")) {
        context.report({
          node,
          message:
            "Dimensions.get() does not update on screen rotation or resize - use useWindowDimensions() for reactive layout",
        });
      }

      if (isMemberProperty(node.callee, "addEventListener")) {
        context.report({
          node,
          message:
            "Dimensions.addEventListener() was removed in React Native 0.72 - use useWindowDimensions() instead",
        });
      }
    },
  }),
});
