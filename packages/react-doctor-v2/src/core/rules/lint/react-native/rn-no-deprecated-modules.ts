import { defineRule } from "../../registry.js";
import { DEPRECATED_RN_MODULE_REPLACEMENTS, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnNoDeprecatedModules = defineRule<Rule>({
  recommendation:
    "Replace deprecated React Native modules with their current community or platform-supported packages.",
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
        const importedName = specifier.imported?.name;
        if (!importedName) continue;

        const replacement = DEPRECATED_RN_MODULE_REPLACEMENTS.get(importedName);
        if (!replacement) continue;

        context.report({
          node: specifier,
          message: `"${importedName}" was removed from react-native - use ${replacement} instead`,
        });
      }
    },
  }),
});
