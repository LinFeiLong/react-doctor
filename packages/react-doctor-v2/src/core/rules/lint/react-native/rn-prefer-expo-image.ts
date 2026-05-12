import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnPreferExpoImage = defineRule<Rule>({
  recommendation:
    "Use expo-image for production image rendering in Expo apps to get better caching and performance.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (node.source?.value !== "react-native") return;
      for (const specifier of node.specifiers ?? []) {
        if (!isNodeOfType(specifier, "ImportSpecifier")) continue;
        if (specifier.imported?.name !== "Image") continue;
        context.report({
          node: specifier,
          message:
            "Importing Image from react-native - prefer expo-image for caching, placeholders, and progressive loading (drop-in API)",
        });
      }
    },
  }),
});
