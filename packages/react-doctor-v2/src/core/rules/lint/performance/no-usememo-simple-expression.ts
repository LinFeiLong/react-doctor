import { defineRule } from "../../registry.js";
import { isHookCall, isTriviallyCheapExpression, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noUsememoSimpleExpression = defineRule<Rule>({
  recommendation:
    "Remove useMemo around cheap primitive expressions; memoize only measured expensive work or unstable identities passed to memoized children.",
  examples: [
    {
      before: `const isOpen = useMemo(() => count > 0, [count]);`,
      after: `const isOpen = count > 0;`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, "useMemo")) return;

      const callback = node.arguments?.[0];
      if (!callback) return;
      if (
        !isNodeOfType(callback, "ArrowFunctionExpression") &&
        !isNodeOfType(callback, "FunctionExpression")
      )
        return;

      let returnExpression = null;
      if (!isNodeOfType(callback.body, "BlockStatement")) {
        returnExpression = callback.body;
      } else if (
        callback.body.body?.length === 1 &&
        isNodeOfType(callback.body.body[0], "ReturnStatement")
      ) {
        returnExpression = callback.body.body[0].argument;
      }

      if (returnExpression && isTriviallyCheapExpression(returnExpression)) {
        context.report({
          node,
          message:
            "useMemo wrapping a trivially cheap expression - memo overhead exceeds the computation",
        });
      }
    },
  }),
});
