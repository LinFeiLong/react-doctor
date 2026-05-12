import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartNoUseServerInHandler = defineRule<Rule>({
  recommendation:
    "Keep server functions defined at module scope and call them from handlers instead of creating use server functions inside handlers.",
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

      const handlerFunction = node.arguments?.[0];
      if (
        !handlerFunction ||
        (!isNodeOfType(handlerFunction, "ArrowFunctionExpression") &&
          !isNodeOfType(handlerFunction, "FunctionExpression"))
      )
        return;

      const body = handlerFunction.body;
      if (!isNodeOfType(body, "BlockStatement")) return;

      const hasUseServerDirective = body.body?.some(
        (statement: EsTreeNode) =>
          isNodeOfType(statement, "ExpressionStatement") &&
          (statement.directive === "use server" ||
            (isNodeOfType(statement.expression, "Literal") &&
              statement.expression.value === "use server")),
      );

      if (hasUseServerDirective) {
        context.report({
          node: handlerFunction,
          message:
            '"use server" inside createServerFn handler - TanStack Start handles this automatically, remove the directive',
        });
      }
    },
  }),
});
