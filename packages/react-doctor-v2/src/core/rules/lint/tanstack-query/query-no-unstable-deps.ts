import { defineRule } from "../../registry.js";
import { TANSTACK_QUERY_HOOKS, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const queryNoUnstableDeps = defineRule<Rule>({
  recommendation:
    "Do not put the whole TanStack Query result object in React dependency arrays; destructure the stable fields you need and depend on those fields.",
  examples: [
    {
      before: `const query = useQuery(options);\nuseEffect(() => sync(query.data), [query]);`,
      after: `const { data } = useQuery(options);\nuseEffect(() => sync(data), [data]);`,
    },
  ],
  create: (context: RuleContext) => {
    const queryResultBindings = new Set<string>();

    return {
      VariableDeclarator(node: EsTreeNode) {
        if (!isNodeOfType(node.id, "Identifier")) return;
        if (!isNodeOfType(node.init, "CallExpression")) return;
        const calleeName = isNodeOfType(node.init.callee, "Identifier")
          ? node.init.callee.name
          : null;
        if (!calleeName || !TANSTACK_QUERY_HOOKS.has(calleeName)) return;
        queryResultBindings.add(node.id.name);
      },
      ArrayExpression(node: EsTreeNode) {
        for (const element of node.elements ?? []) {
          if (!isNodeOfType(element, "Identifier") || !queryResultBindings.has(element.name))
            continue;
          context.report({
            node: element,
            message: `TanStack Query result "${element.name}" is unstable in dependency arrays - destructure the specific field such as data or status`,
          });
        }
      },
    };
  },
});
