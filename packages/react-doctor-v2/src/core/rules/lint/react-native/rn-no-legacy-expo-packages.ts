import { defineRule } from "../../registry.js";
import { LEGACY_EXPO_PACKAGE_REPLACEMENTS } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnNoLegacyExpoPackages = defineRule<Rule>({
  recommendation:
    "Use the current Expo package names and APIs instead of legacy package entry points.",
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
      if (typeof source !== "string") return;

      for (const [packageName, replacement] of LEGACY_EXPO_PACKAGE_REPLACEMENTS) {
        if (source === packageName || source.startsWith(`${packageName}/`)) {
          context.report({
            node,
            message: `"${packageName}" is deprecated - use ${replacement}`,
          });
          return;
        }
      }
    },
  }),
});
