import { defineRule } from "../../registry.js";
import { getImportSourceValue, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackAiNoDirectClientImport = defineRule<Rule>({
  recommendation:
    "Import client hooks from the framework package such as @tanstack/ai-react; only vanilla JavaScript should import @tanstack/ai-client directly.",
  examples: [
    {
      before: `import { useChat } from "@tanstack/ai-client";`,
      after: `import { useChat } from "@tanstack/ai-react";`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (getImportSourceValue(node) !== "@tanstack/ai-client") return;
      context.report({
        node,
        message:
          "direct @tanstack/ai-client import bypasses framework integration - use @tanstack/ai-react, @tanstack/ai-solid, or the matching framework package",
      });
    },
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "Identifier") || node.callee.name !== "require") return;
      const source = node.arguments?.[0];
      if (!isNodeOfType(source, "Literal") || source.value !== "@tanstack/ai-client") return;
      context.report({
        node,
        message:
          "direct @tanstack/ai-client require bypasses framework integration - use the matching TanStack AI framework package",
      });
    },
  }),
});
