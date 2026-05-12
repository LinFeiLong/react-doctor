import { defineRule } from "../../registry.js";
import { TANSTACK_QUERY_HOOKS, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const queryNoRestDestructuring = defineRule<Rule>({
  recommendation:
    "Destructure only the query result fields you need so tracked properties and memoization remain precise.",
  examples: [
    {
      before: `const result = useQuery({ queryKey: ["items"], queryFn: saveItem });`,
      after: `const mutation = useMutation({ mutationFn: saveItem, onSuccess: invalidateItems });`,
    },
  ],
  create: (context: RuleContext) => ({
    VariableDeclarator(node: EsTreeNode) {
      if (!isNodeOfType(node.id, "ObjectPattern")) return;
      if (!isNodeOfType(node.init, "CallExpression")) return;

      const calleeName = isNodeOfType(node.init.callee, "Identifier")
        ? node.init.callee.name
        : null;

      if (!calleeName || !TANSTACK_QUERY_HOOKS.has(calleeName)) return;

      const hasRestElement = node.id.properties?.some((property: EsTreeNode) =>
        isNodeOfType(property, "RestElement"),
      );

      if (hasRestElement) {
        context.report({
          node: node.id,
          message: `Rest destructuring on ${calleeName}() result - subscribes to all fields and causes unnecessary re-renders. Destructure only the fields you need`,
        });
      }
    },
  }),
});
