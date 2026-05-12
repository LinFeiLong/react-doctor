import { defineRule } from "../../registry.js";
import { REACT_NATIVE_LIST_COMPONENTS, resolveJsxElementName, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnNoInlineFlatlistRenderitem = defineRule<Rule>({
  recommendation:
    "Hoist FlatList renderItem callbacks or memoize them so list rows do not receive a new renderer each render.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "renderItem") return;
      if (!node.value || !isNodeOfType(node.value, "JSXExpressionContainer")) return;

      const openingElement = node.parent;
      if (!openingElement || !isNodeOfType(openingElement, "JSXOpeningElement")) return;

      const listComponentName = resolveJsxElementName(openingElement);
      if (!listComponentName || !REACT_NATIVE_LIST_COMPONENTS.has(listComponentName)) return;

      const expression = node.value.expression;
      if (
        !isNodeOfType(expression, "ArrowFunctionExpression") &&
        !isNodeOfType(expression, "FunctionExpression")
      )
        return;

      context.report({
        node: expression,
        message: `Inline renderItem on <${listComponentName}> creates a new function reference every render - extract to a named function or wrap in useCallback`,
      });
    },
  }),
});
