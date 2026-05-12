import { defineRule } from "../../registry.js";
import { MUTATING_HTTP_METHODS, TANSTACK_QUERY_HOOKS, isNodeOfType, walkAst } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const queryNoUseQueryForMutation = defineRule<Rule>({
  recommendation: "Use useMutation for writes and useQuery only for idempotent reads.",
  examples: [
    {
      before: `const result = useQuery({ queryKey: ["items"], queryFn: saveItem });`,
      after: `const mutation = useMutation({ mutationFn: saveItem, onSuccess: invalidateItems });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const calleeName = isNodeOfType(node.callee, "Identifier") ? node.callee.name : null;

      if (!calleeName || !TANSTACK_QUERY_HOOKS.has(calleeName)) return;

      const optionsArgument = node.arguments?.[0];
      if (!isNodeOfType(optionsArgument, "ObjectExpression")) return;

      const queryFnProperty = optionsArgument.properties?.find(
        (property: EsTreeNode) =>
          isNodeOfType(property, "Property") &&
          isNodeOfType(property.key, "Identifier") &&
          property.key.name === "queryFn",
      );

      if (!queryFnProperty?.value) return;

      let hasMutatingFetch = false;
      walkAst(queryFnProperty.value, (child: EsTreeNode) => {
        if (hasMutatingFetch) return;
        if (!isNodeOfType(child, "CallExpression")) return;
        if (!isNodeOfType(child.callee, "Identifier") || child.callee.name !== "fetch") return;

        const optionsArg = child.arguments?.[1];
        if (!isNodeOfType(optionsArg, "ObjectExpression")) return;

        const methodProperty = optionsArg.properties?.find(
          (property: EsTreeNode) =>
            isNodeOfType(property, "Property") &&
            isNodeOfType(property.key, "Identifier") &&
            property.key.name === "method" &&
            isNodeOfType(property.value, "Literal") &&
            typeof property.value.value === "string" &&
            MUTATING_HTTP_METHODS.has(property.value.value.toUpperCase()),
        );

        if (methodProperty) hasMutatingFetch = true;
      });

      if (hasMutatingFetch) {
        context.report({
          node,
          message: `${calleeName}() with a mutating fetch (POST/PUT/DELETE) - use useMutation() instead, which provides onSuccess/onError callbacks and doesn't auto-refetch`,
        });
      }
    },
  }),
});
