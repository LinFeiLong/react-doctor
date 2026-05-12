import { defineRule } from "../../registry.js";
import {
  USER_EVENT_METHODS,
  getMemberPropertyName,
  getRootIdentifierName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const isAwaited = (node: EsTreeNode): boolean => isNodeOfType(node.parent, "AwaitExpression");

export const testingAwaitUserEvent = defineRule<Rule>({
  recommendation:
    "Await async userEvent interactions so assertions run after the browser-like event sequence has finished.",
  examples: [
    {
      before: `userEvent.click(screen.getByRole("button"));`,
      after: `await userEvent.click(screen.getByRole("button"));`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;
      if (getRootIdentifierName(node.callee) !== "userEvent") return;
      const methodName = getMemberPropertyName(node.callee);
      if (!methodName || !USER_EVENT_METHODS.has(methodName)) return;
      if (isAwaited(node)) return;
      context.report({
        node,
        message: `userEvent.${methodName}() is async - await it before asserting`,
      });
    },
  }),
});
