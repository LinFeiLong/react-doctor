import { defineRule } from "../../registry.js";
import { NEXTJS_NAVIGATION_FUNCTIONS, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsNoRedirectInTryCatch = defineRule<Rule>({
  recommendation:
    "Call redirect outside try/catch blocks or rethrow redirect errors so Next.js can handle the control flow.",
  examples: [
    {
      before: `try { redirect("/login"); } catch (error) { log(error); }`,
      after: `if (!user) redirect("/login");`,
    },
  ],
  create: (context: RuleContext) => {
    let tryCatchDepth = 0;

    return {
      TryStatement() {
        tryCatchDepth++;
      },
      "TryStatement:exit"() {
        tryCatchDepth--;
      },
      CallExpression(node: EsTreeNode) {
        if (tryCatchDepth === 0) return;
        if (!isNodeOfType(node.callee, "Identifier")) return;
        if (!NEXTJS_NAVIGATION_FUNCTIONS.has(node.callee.name)) return;

        context.report({
          node,
          message: `${node.callee.name}() inside try-catch - this throws a special error Next.js handles internally. Move it outside the try block or use unstable_rethrow() in the catch`,
        });
      },
    };
  },
});
