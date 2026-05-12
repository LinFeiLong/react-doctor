import { defineRule } from "../../registry.js";
import { extractIndexName, isInsideStaticPlaceholderMap, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noArrayIndexAsKey = defineRule<Rule>({
  recommendation:
    "Use a stable item id for React keys so inserts, deletes, and sorting preserve component state correctly.",
  examples: [
    {
      before: `{items.map((item, index) => <Row key={index} item={item} />)}`,
      after: `{items.map((item) => <Row key={item.id} item={item} />)}`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "key") return;
      if (!node.value || !isNodeOfType(node.value, "JSXExpressionContainer")) return;

      const indexName = extractIndexName(node.value.expression);
      if (!indexName) return;
      if (isInsideStaticPlaceholderMap(node)) return;

      context.report({
        node,
        message: `Array index "${indexName}" used as key - causes bugs when list is reordered or filtered`,
      });
    },
  }),
});
