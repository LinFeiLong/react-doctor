import { defineRule } from "../../registry.js";
import { RENDER_ITEM_PROP_NAMES, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnNoInlineObjectInListItem = defineRule<Rule>({
  recommendation:
    "Hoist or memoize object props passed to list rows so recycled cells do not re-render from fresh identities.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => {
    let renderItemDepth = 0;

    const isRenderItemAttribute = (parent: EsTreeNode | null | undefined): boolean => {
      if (!isNodeOfType(parent, "JSXAttribute")) return false;
      const attrName = isNodeOfType(parent.name, "JSXIdentifier") ? parent.name.name : null;
      return attrName ? RENDER_ITEM_PROP_NAMES.has(attrName) : false;
    };

    const isRenderItemFunction = (node: EsTreeNode): boolean => {
      if (
        !isNodeOfType(node, "ArrowFunctionExpression") &&
        !isNodeOfType(node, "FunctionExpression")
      ) {
        return false;
      }
      // Walk up: parent should be JSXExpressionContainer whose parent is JSXAttribute renderItem.
      const expressionContainer = node.parent;
      if (!isNodeOfType(expressionContainer, "JSXExpressionContainer")) return false;
      return isRenderItemAttribute(expressionContainer.parent);
    };

    const enter = (node: EsTreeNode): void => {
      if (isRenderItemFunction(node)) renderItemDepth++;
    };
    const exit = (node: EsTreeNode): void => {
      if (isRenderItemFunction(node)) renderItemDepth = Math.max(0, renderItemDepth - 1);
    };

    return {
      ArrowFunctionExpression: enter,
      "ArrowFunctionExpression:exit": exit,
      FunctionExpression: enter,
      "FunctionExpression:exit": exit,
      JSXAttribute(node: EsTreeNode) {
        if (renderItemDepth === 0) return;
        if (!isNodeOfType(node.value, "JSXExpressionContainer")) return;
        if (!isNodeOfType(node.value.expression, "ObjectExpression")) return;
        const propName = isNodeOfType(node.name, "JSXIdentifier") ? node.name.name : "<unknown>";
        context.report({
          node,
          message: `Inline object literal on "${propName}" inside renderItem - allocates a fresh reference per row and breaks memo() on the row component. Hoist outside renderItem or pass primitives`,
        });
      },
    };
  },
});
