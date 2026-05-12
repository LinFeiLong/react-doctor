import { defineRule } from "../../registry.js";
import {
  TANSTACK_MIDDLEWARE_METHOD_ORDER,
  TANSTACK_SERVER_FN_NAMES,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartServerFnMethodOrder = defineRule<Rule>({
  recommendation:
    "Declare TanStack server function method and validation before handler logic so the contract is visible first.",
  examples: [
    {
      before: `export const Route = createFileRoute("/items")({ component: Items });`,
      after: `export const Route = createFileRoute("/items")({ loader, head, component: Items });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;

      const methodNames: string[] = [];
      let currentNode: EsTreeNode = node;

      while (
        isNodeOfType(currentNode, "CallExpression") &&
        isNodeOfType(currentNode.callee, "MemberExpression")
      ) {
        const methodName = isNodeOfType(currentNode.callee.property, "Identifier")
          ? currentNode.callee.property.name
          : null;
        if (methodName) methodNames.unshift(methodName);
        currentNode = currentNode.callee.object;
      }

      if (
        isNodeOfType(currentNode, "CallExpression") &&
        isNodeOfType(currentNode.callee, "Identifier")
      ) {
        if (!TANSTACK_SERVER_FN_NAMES.has(currentNode.callee.name)) return;
      } else {
        return;
      }

      const ownMethodName = isNodeOfType(node.callee.property, "Identifier")
        ? node.callee.property.name
        : null;
      if (methodNames[methodNames.length - 1] !== ownMethodName) return;

      const orderSensitiveMethods = methodNames.filter((name) =>
        TANSTACK_MIDDLEWARE_METHOD_ORDER.includes(name),
      );

      let lastIndex = -1;
      for (const methodName of orderSensitiveMethods) {
        const currentIndex = TANSTACK_MIDDLEWARE_METHOD_ORDER.indexOf(methodName);
        if (currentIndex < lastIndex) {
          const expectedBefore = TANSTACK_MIDDLEWARE_METHOD_ORDER[lastIndex];
          context.report({
            node,
            message: `Server function method .${methodName}() must come before .${expectedBefore}() - wrong order breaks type inference`,
          });
          return;
        }
        lastIndex = currentIndex;
      }
    },
  }),
});
