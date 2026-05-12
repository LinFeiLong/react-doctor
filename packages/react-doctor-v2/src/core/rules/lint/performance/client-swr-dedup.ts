import { defineRule } from "../../registry.js";
import { EFFECT_HOOK_NAMES, isHookCall, walkAst, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const clientSwrDedup = defineRule<Rule>({
  recommendation:
    "Use SWR, TanStack Query, or another shared client data layer for client fetches so duplicate component instances dedupe requests.",
  examples: [
    {
      before: `useEffect(() => { fetch("/api/user").then(setUser); }, []);`,
      after: `const { data: user } = useSWR("/api/user", fetcher);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
      const callback = node.arguments?.[0];
      if (!callback) return;
      let hasFetch = false;
      walkAst(callback, (child: EsTreeNode) => {
        if (hasFetch) return false;
        hasFetch =
          isNodeOfType(child, "CallExpression") &&
          isNodeOfType(child.callee, "Identifier") &&
          child.callee.name === "fetch";
      });
      if (!hasFetch) return;
      context.report({
        node,
        message:
          "fetch inside useEffect creates per-instance requests - use SWR/useSWRMutation or a shared client data layer for deduplication and caching",
      });
    },
  }),
});
