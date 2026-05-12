import { defineRule } from "../../registry.js";
import { TANSTACK_REDIRECT_FUNCTIONS, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartRedirectInTryCatch = defineRule<Rule>({
  recommendation:
    "Call redirects outside try/catch blocks or rethrow redirect errors so TanStack can handle control flow.",
  examples: [
    {
      before: `export const Route = createFileRoute("/items")({ component: Items });`,
      after: `export const Route = createFileRoute("/items")({ loader, head, component: Items });`,
    },
  ],
  create: (context: RuleContext) => {
    let tryBlockDepth = 0;
    let catchClauseDepth = 0;

    return {
      TryStatement() {
        tryBlockDepth++;
      },
      "TryStatement:exit"() {
        tryBlockDepth--;
      },
      CatchClause() {
        catchClauseDepth++;
      },
      "CatchClause:exit"() {
        catchClauseDepth--;
      },
      ThrowStatement(node: EsTreeNode) {
        if (tryBlockDepth === 0) return;
        if (catchClauseDepth > 0) return;

        const argument = node.argument;
        if (!isNodeOfType(argument, "CallExpression")) return;
        if (!isNodeOfType(argument.callee, "Identifier")) return;
        if (!TANSTACK_REDIRECT_FUNCTIONS.has(argument.callee.name)) return;

        context.report({
          node,
          message: `throw ${argument.callee.name}() inside try block - the router catches this internally. Move it outside the try block or re-throw in the catch`,
        });
      },
    };
  },
});
