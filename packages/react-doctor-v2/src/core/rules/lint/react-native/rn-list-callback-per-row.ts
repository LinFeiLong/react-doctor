import { defineRule } from "../../registry.js";
import { detectInlineRowHandlers, isRenderItemFunction, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnListCallbackPerRow = defineRule<Rule>({
  recommendation:
    "Use stable row callbacks or pass item ids into a shared handler so each list row does not receive a new function every render.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => {
    const inspect = (node: EsTreeNode): void => {
      if (!isRenderItemFunction(node)) return;
      const inlineHandlers = detectInlineRowHandlers(node);
      for (const handler of inlineHandlers) {
        const handlerName = isNodeOfType(handler.name, "JSXIdentifier")
          ? handler.name.name
          : "<handler>";
        context.report({
          node: handler,
          message: `Inline ${handlerName} arrow inside renderItem creates a fresh closure per row - hoist with useCallback at list scope and pass the row id as a primitive prop`,
        });
      }
    };

    return {
      ArrowFunctionExpression: inspect,
      FunctionExpression: inspect,
    };
  },
});
