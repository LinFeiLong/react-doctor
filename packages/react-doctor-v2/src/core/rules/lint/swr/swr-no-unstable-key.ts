import { defineRule } from "../../registry.js";
import { SWR_HOOK_NAMES, containsUnstableSWRKeyValue, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const swrNoUnstableKey = defineRule<Rule>({
  recommendation:
    "Keep SWR keys deterministic; include stable request inputs and never use time or random values in cache keys.",
  examples: [
    {
      before: `useSWR(["/api/items", Date.now()], fetcher);`,
      after: `useSWR(["/api/items", filters], fetcher);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const calleeName = isNodeOfType(node.callee, "Identifier") ? node.callee.name : null;
      if (!calleeName || !SWR_HOOK_NAMES.has(calleeName)) return;
      const unstableSource = containsUnstableSWRKeyValue(node.arguments?.[0]);
      if (!unstableSource) return;
      context.report({
        node: node.arguments[0],
        message: `SWR key contains ${unstableSource} - use stable key parts so deduping and cache identity work`,
      });
    },
  }),
});
