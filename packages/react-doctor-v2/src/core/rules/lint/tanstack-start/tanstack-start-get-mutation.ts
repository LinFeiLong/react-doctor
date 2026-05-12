import { defineRule } from "../../registry.js";
import {
  MUTATING_HTTP_METHODS,
  findSideEffect,
  walkServerFnChain,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartGetMutation = defineRule<Rule>({
  recommendation:
    "Use mutation methods such as POST for writes instead of performing mutations from GET handlers.",
  examples: [
    {
      before: `export const Route = createFileRoute("/items")({ component: Items });`,
      after: `export const Route = createFileRoute("/items")({ loader, head, component: Items });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;
      if (
        !isNodeOfType(node.callee.property, "Identifier") ||
        node.callee.property.name !== "handler"
      )
        return;

      const chainInfo = walkServerFnChain(node);
      if (!chainInfo.isServerFnChain) return;
      if (
        chainInfo.specifiedMethod &&
        MUTATING_HTTP_METHODS.has(chainInfo.specifiedMethod.toUpperCase())
      )
        return;

      const handlerFunction = node.arguments?.[0];
      if (!handlerFunction) return;

      const sideEffect = findSideEffect(handlerFunction);
      if (sideEffect) {
        context.report({
          node,
          message: `GET server function has side effects (${sideEffect}) - use createServerFn({ method: 'POST' }) for mutations`,
        });
      }
    },
  }),
});
