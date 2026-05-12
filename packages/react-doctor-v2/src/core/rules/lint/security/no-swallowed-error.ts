import { defineRule } from "../../registry.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noSwallowedError = defineRule<Rule>({
  recommendation:
    "Handle caught errors with recovery, logging, or rethrowing; an empty catch only hides runtime evidence and lets broken states look fixed.",
  examples: [
    {
      before: `try { await save(); } catch (error) {}`,
      after: `try { await save(); } catch (error) { reportError(error); throw error; }`,
    },
  ],
  create: (context: RuleContext) => ({
    CatchClause(node: EsTreeNode) {
      const bodyStatements = node.body?.body ?? [];
      if (bodyStatements.length > 0) return;
      context.report({
        node,
        message: "empty catch block swallows runtime evidence - log, recover, or rethrow the error",
      });
    },
  }),
});
