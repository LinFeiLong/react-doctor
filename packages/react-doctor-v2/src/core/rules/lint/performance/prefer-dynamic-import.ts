import { defineRule } from "../../registry.js";
import { HEAVY_LIBRARIES } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const preferDynamicImport = defineRule<Rule>({
  recommendation:
    "Load heavy libraries with dynamic import at the route, interaction, or feature boundary where they are actually needed.",
  examples: [
    {
      before: `import MonacoEditor from "monaco-editor";`,
      after: `const MonacoEditor = dynamic(() => import("monaco-editor"));`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      const source = node.source?.value;
      if (typeof source === "string" && HEAVY_LIBRARIES.has(source)) {
        context.report({
          node,
          message: `"${source}" is a heavy library - use React.lazy() or next/dynamic for code splitting`,
        });
      }
    },
  }),
});
