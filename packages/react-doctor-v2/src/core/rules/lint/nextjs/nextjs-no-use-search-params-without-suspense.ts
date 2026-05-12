import { defineRule } from "../../registry.js";
import { fileMentionsSuspense, isHookCall } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsNoUseSearchParamsWithoutSuspense = defineRule<Rule>({
  recommendation:
    "Wrap useSearchParams usage in Suspense or move it lower in the tree so static routes can stream correctly.",
  examples: [
    {
      before: `<SearchPanel />`,
      after: `<Suspense><SearchPanel /></Suspense>`,
    },
  ],
  create: (context: RuleContext) => {
    let hasSuspenseInFile = false;

    return {
      Program(programNode: EsTreeNode) {
        hasSuspenseInFile = fileMentionsSuspense(programNode);
      },
      CallExpression(node: EsTreeNode) {
        if (hasSuspenseInFile) return;
        if (!isHookCall(node, "useSearchParams")) return;
        context.report({
          node,
          message:
            "useSearchParams() requires a <Suspense> boundary - without one, the entire page bails out to client-side rendering",
        });
      },
    };
  },
});
