import { defineRule } from "../../registry.js";
import { walkAst, walkServerFnChain, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartServerFnValidateInput = defineRule<Rule>({
  recommendation:
    "Validate server function input before using it so server-side assumptions are explicit and safe.",
  examples: [
    {
      before: `export const Route = createFileRoute("/items")({ component: Items });`,
      after: `export const Route = createFileRoute("/items")({ loader, head, component: Items });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;
      if (!isNodeOfType(node.callee.property, "Identifier")) return;
      if (node.callee.property.name !== "handler") return;

      const chainInfo = walkServerFnChain(node);
      if (!chainInfo.isServerFnChain) return;

      const handlerFunction = node.arguments?.[0];
      if (!handlerFunction) return;

      let accessesData = false;
      walkAst(handlerFunction, (child: EsTreeNode) => {
        if (
          isNodeOfType(child, "MemberExpression") &&
          isNodeOfType(child.property, "Identifier") &&
          child.property.name === "data"
        ) {
          accessesData = true;
        }
        if (
          isNodeOfType(child, "ObjectPattern") &&
          child.properties?.some(
            (property: EsTreeNode) =>
              isNodeOfType(property.key, "Identifier") && property.key.name === "data",
          )
        ) {
          accessesData = true;
        }
      });

      if (accessesData && !chainInfo.hasInputValidator) {
        context.report({
          node,
          message:
            "Server function handler accesses data without inputValidator() - validate inputs crossing the network boundary",
        });
      }
    },
  }),
});
