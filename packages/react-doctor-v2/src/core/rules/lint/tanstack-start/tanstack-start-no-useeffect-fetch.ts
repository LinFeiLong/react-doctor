import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  TANSTACK_ROUTE_FILE_PATTERN,
  isHookCall,
  walkAst,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartNoUseEffectFetch = defineRule<Rule>({
  recommendation: "Fetch route data in TanStack loaders or queries instead of useEffect.",
  examples: [
    {
      before: `export const Route = createFileRoute("/items")({ component: Items });`,
      after: `export const Route = createFileRoute("/items")({ loader, head, component: Items });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const filename = context.getFilename?.() ?? "";
      const isRouteFile = TANSTACK_ROUTE_FILE_PATTERN.test(filename);
      if (!isRouteFile) return;

      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;

      const callback = node.arguments?.[0];
      if (!callback) return;

      let hasFetchCall = false;
      walkAst(callback, (child: EsTreeNode) => {
        if (hasFetchCall) return;
        if (
          isNodeOfType(child, "CallExpression") &&
          isNodeOfType(child.callee, "Identifier") &&
          child.callee.name === "fetch"
        ) {
          hasFetchCall = true;
        }
      });

      if (hasFetchCall) {
        context.report({
          node,
          message:
            "fetch() inside useEffect in a route file - use the route loader or createServerFn() instead",
        });
      }
    },
  }),
});
