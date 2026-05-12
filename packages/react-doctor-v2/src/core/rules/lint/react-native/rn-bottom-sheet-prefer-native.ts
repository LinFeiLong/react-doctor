import { defineRule } from "../../registry.js";
import { JS_BOTTOM_SHEET_PACKAGES } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnBottomSheetPreferNative = defineRule<Rule>({
  recommendation:
    "Use a native-backed bottom sheet implementation for gesture-heavy sheets instead of JS-only modal patterns.",
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
      if (typeof source !== "string" || !JS_BOTTOM_SHEET_PACKAGES.has(source)) return;
      context.report({
        node,
        message: `${source} is a JS-implemented bottom sheet - for v7+ RN, prefer <Modal presentationStyle="formSheet"> for native gesture handling and snap points`,
      });
    },
  }),
});
