import { defineRule } from "../../registry.js";
import {
  APP_ROUTER_FILE_PATTERN,
  NON_PROJECT_PATH_PATTERN,
  isFetchCall,
  isNodeOfType,
  objectExpressionHasNextRevalidate,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const serverFetchWithoutRevalidate = defineRule<Rule>({
  recommendation:
    "Add an explicit cache, revalidate, or no-store policy to server fetch calls so data freshness is intentional.",
  examples: [
    {
      before: `await fetch("https://api.example.com/posts");`,
      after: `await fetch("https://api.example.com/posts", { next: { revalidate: 60 } });`,
    },
  ],
  create: (context: RuleContext) => {
    let isServerSideFile = false;

    return {
      Program(node: EsTreeNode) {
        const filename = context.getFilename?.() ?? "";
        if (!APP_ROUTER_FILE_PATTERN.test(filename)) {
          isServerSideFile = false;
          return;
        }
        if (NON_PROJECT_PATH_PATTERN.test(filename)) {
          isServerSideFile = false;
          return;
        }
        const hasUseClient = (node.body ?? []).some(
          (statement: EsTreeNode) =>
            isNodeOfType(statement, "ExpressionStatement") &&
            isNodeOfType(statement.expression, "Literal") &&
            statement.expression.value === "use client",
        );
        isServerSideFile = !hasUseClient;
      },
      CallExpression(node: EsTreeNode) {
        if (!isServerSideFile) return;
        if (!isFetchCall(node)) return;

        const optionsArg = node.arguments?.[1];
        if (optionsArg && objectExpressionHasNextRevalidate(optionsArg)) return;

        const urlArg = node.arguments?.[0];
        const urlText =
          isNodeOfType(urlArg, "Literal") && typeof urlArg.value === "string"
            ? `"${urlArg.value}"`
            : "url";
        context.report({
          node,
          message: `fetch(${urlText}) in a Server Component / route handler defaults to forever-caching - pass { next: { revalidate: <seconds> } } / { next: { tags: [...] } } / { cache: "no-store" } so stale data doesn't quietly persist`,
        });
      },
    };
  },
});
