import { defineRule } from "../../registry.js";
import { getPropertyKeyName, getRouteOptionsObject, walkAst, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartNoDirectFetchInLoader = defineRule<Rule>({
  recommendation:
    "Use typed server functions or shared data helpers from loaders instead of ad hoc fetch calls.",
  examples: [
    {
      before: `export const Route = createFileRoute("/items")({ component: Items });`,
      after: `export const Route = createFileRoute("/items")({ loader, head, component: Items });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const optionsObject = getRouteOptionsObject(node);
      if (!optionsObject) return;

      const properties = optionsObject.properties ?? [];
      for (const property of properties) {
        const keyName = getPropertyKeyName(property);
        if (keyName !== "loader") continue;

        const loaderValue = property.value ?? property;
        walkAst(loaderValue, (child: EsTreeNode) => {
          if (!isNodeOfType(child, "CallExpression")) return;
          if (isNodeOfType(child.callee, "Identifier") && child.callee.name === "fetch") {
            context.report({
              node: child,
              message:
                "Direct fetch() in route loader - use createServerFn() for type-safe server logic with automatic RPC",
            });
          }
        });
      }
    },
  }),
});
