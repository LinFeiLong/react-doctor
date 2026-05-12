import { defineRule } from "../../registry.js";
import { REANIMATED_LAYOUT_KEYS, findReturnedObject, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnAnimateLayoutProperty = defineRule<Rule>({
  recommendation:
    "Animate transforms and opacity with Reanimated instead of layout properties that force repeated layout work.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "Identifier") || node.callee.name !== "useAnimatedStyle")
        return;
      const callback = node.arguments?.[0];
      if (!callback) return;
      const returnedObject = findReturnedObject(callback);
      if (!returnedObject) return;

      for (const property of returnedObject.properties ?? []) {
        if (!isNodeOfType(property, "Property")) continue;
        if (!isNodeOfType(property.key, "Identifier")) continue;
        if (!REANIMATED_LAYOUT_KEYS.has(property.key.name)) continue;

        context.report({
          node: property,
          message: `useAnimatedStyle animating "${property.key.name}" - layout properties run on the layout thread; use transform: [{ translateX/Y }, { scale }] or opacity for GPU-accelerated animation`,
        });
      }
    },
  }),
});
