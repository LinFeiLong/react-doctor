import { defineRule } from "../../registry.js";
import { hasDirective, isComponentAssignment, isUppercaseName } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsAsyncClientComponent = defineRule<Rule>({
  recommendation:
    "Keep Client Components synchronous and move async data loading to Server Components, loaders, or client data hooks.",
  examples: [
    {
      before: `"use client";
export default async function Page() {}`,
      after: `export default function Page() {}`,
    },
  ],
  create: (context: RuleContext) => {
    let fileHasUseClient = false;

    return {
      Program(programNode: EsTreeNode) {
        fileHasUseClient = hasDirective(programNode, "use client");
      },
      FunctionDeclaration(node: EsTreeNode) {
        if (!fileHasUseClient || !node.async) return;
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        context.report({
          node,
          message: `Async client component "${node.id.name}" - client components cannot be async`,
        });
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!fileHasUseClient) return;
        if (!isComponentAssignment(node) || !node.init?.async) return;
        context.report({
          node,
          message: `Async client component "${node.id.name}" - client components cannot be async`,
        });
      },
    };
  },
});
