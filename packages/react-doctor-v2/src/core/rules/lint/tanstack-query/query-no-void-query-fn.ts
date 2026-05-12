import { defineRule } from "../../registry.js";
import { TANSTACK_QUERY_HOOKS, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const queryNoVoidQueryFn = defineRule<Rule>({
  recommendation:
    "Return the fetched value from queryFn and move side effects to mutations or callbacks.",
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

      const queryFnValue = queryFnProperty.value;

      if (
        isNodeOfType(queryFnValue, "ArrowFunctionExpression") &&
        !isNodeOfType(queryFnValue.body, "BlockStatement")
      ) {
        return;
      }

      if (
        isNodeOfType(queryFnValue, "ArrowFunctionExpression") ||
        isNodeOfType(queryFnValue, "FunctionExpression")
      ) {
        const body = queryFnValue.body;
        if (!isNodeOfType(body, "BlockStatement")) return;

        const statements = body.body ?? [];
        if (statements.length === 0) {
          context.report({
            node: queryFnProperty,
            message:
              "Empty queryFn - query functions must return a value. Use the enabled option to conditionally disable the query instead",
          });
        }
      }
    },
  }),
});
