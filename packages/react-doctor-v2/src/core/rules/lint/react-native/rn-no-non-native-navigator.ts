import { defineRule } from "../../registry.js";
import { NON_NATIVE_NAVIGATOR_PACKAGES } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnNoNonNativeNavigator = defineRule<Rule>({
  recommendation:
    "Use native-stack or platform-native navigation primitives for mobile screens when possible.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      const source = node.source?.value;
      if (typeof source !== "string" || !NON_NATIVE_NAVIGATOR_PACKAGES.has(source)) return;
      const replacement = source.replace("@react-navigation/", "@react-navigation/native-");
      context.report({
        node,
        message: `${source} uses a JS-implemented navigator - use ${replacement} for native iOS/Android transitions and gestures`,
      });
    },
  }),
});
