import { defineRule } from "../../registry.js";
import {
  QUERY_CACHE_UPDATE_METHODS,
  TANSTACK_MUTATION_HOOKS,
  isNodeOfType,
  walkAst,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const queryMutationMissingInvalidation = defineRule<Rule>({
  recommendation:
    "Invalidate, update, or remove affected queries after mutations so cached data stays correct.",
  examples: [
    {
      before: `const result = useQuery({ queryKey: ["items"], queryFn: saveItem });`,
      after: `const mutation = useMutation({ mutationFn: saveItem, onSuccess: invalidateItems });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const calleeName = isNodeOfType(node.callee, "Identifier") ? node.callee.name : null;

      if (!calleeName || !TANSTACK_MUTATION_HOOKS.has(calleeName)) return;

      const optionsArgument = node.arguments?.[0];
      if (!isNodeOfType(optionsArgument, "ObjectExpression")) return;

      const hasMutationFn = optionsArgument.properties?.some(
        (property: EsTreeNode) =>
          isNodeOfType(property, "Property") &&
          isNodeOfType(property.key, "Identifier") &&
          property.key.name === "mutationFn",
      );

      if (!hasMutationFn) return;

      let hasCacheUpdate = false;
      walkAst(optionsArgument, (child: EsTreeNode) => {
        if (hasCacheUpdate) return false;
        if (
          isNodeOfType(child, "CallExpression") &&
          isNodeOfType(child.callee, "MemberExpression") &&
          isNodeOfType(child.callee.property, "Identifier") &&
          QUERY_CACHE_UPDATE_METHODS.has(child.callee.property.name)
        ) {
          hasCacheUpdate = true;
          return false;
        }
      });

      if (!hasCacheUpdate) {
        context.report({
          node,
          message:
            "useMutation without a cache update - stale data may remain after the mutation. Call queryClient.invalidateQueries / setQueryData / resetQueries / refetchQueries inside onSuccess (or trigger a router refresh)",
        });
      }
    },
  }),
});
