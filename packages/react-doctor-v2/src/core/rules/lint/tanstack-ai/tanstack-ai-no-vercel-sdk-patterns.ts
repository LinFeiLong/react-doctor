import { defineRule } from "../../registry.js";
import {
  TANSTACK_AI_IMPORT_PATTERN,
  VERCEL_AI_SDK_IMPORTS,
  getImportSourceValue,
  getImportedName,
  getNamespaceImportName,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackAiNoVercelSdkPatterns = defineRule<Rule>({
  recommendation:
    "In TanStack AI code, use chat() from @tanstack/ai and provider adapters such as openaiText(); do not mix in Vercel AI SDK helpers like streamText() or createOpenAI().",
  examples: [
    {
      before: `import { streamText } from "ai";`,
      after: `import { chat } from "@tanstack/ai";`,
    },
  ],
  create: (context: RuleContext) => {
    let hasTanstackAiImport = false;
    const incompatibleImports: Array<{ node: EsTreeNode; importedName: string; source: string }> =
      [];

    return {
      ImportDeclaration(node: EsTreeNode) {
        const source = getImportSourceValue(node);
        if (!source) return;
        if (TANSTACK_AI_IMPORT_PATTERN.test(source)) {
          hasTanstackAiImport = true;
          return;
        }
        const forbiddenNames = VERCEL_AI_SDK_IMPORTS.get(source);
        if (!forbiddenNames) return;
        for (const specifier of node.specifiers ?? []) {
          const namespaceName = getNamespaceImportName(specifier);
          if (namespaceName) {
            incompatibleImports.push({
              node: specifier,
              importedName: `${namespaceName}.*`,
              source,
            });
            continue;
          }
          const importedName = getImportedName(specifier);
          if (importedName && forbiddenNames.has(importedName)) {
            incompatibleImports.push({ node: specifier, importedName, source });
          }
        }
      },
      "Program:exit"() {
        if (!hasTanstackAiImport) return;
        for (const incompatibleImport of incompatibleImports) {
          context.report({
            node: incompatibleImport.node,
            message: `${incompatibleImport.importedName} from ${incompatibleImport.source} is a Vercel AI SDK pattern - use TanStack AI chat() and provider adapters instead`,
          });
        }
      },
    };
  },
});
