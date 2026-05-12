import { defineRule } from "../../registry.js";
import { EFFECT_HOOK_NAMES, containsFetchCall, getEffectCallback, isHookCall } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noFetchInEffect = defineRule<Rule>({
  recommendation:
    "Move data fetching to the framework loader, Server Component, query library, or Suspense-aware data layer instead of starting requests from useEffect.",
  examples: [
    {
      before: `useEffect(() => { fetch(\`/api/user/\${id}\`).then(setUser); }, [id]);`,
      after: `const user = await getUser(id);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
      const callback = getEffectCallback(node);
      if (!callback) return;

      if (containsFetchCall(callback)) {
        context.report({
          node,
          message:
            "fetch() inside useEffect - use a data fetching library (react-query, SWR) or server component",
        });
      }
    },
  }),
});
