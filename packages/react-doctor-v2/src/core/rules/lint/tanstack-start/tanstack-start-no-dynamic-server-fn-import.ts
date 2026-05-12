import { defineRule } from "../../registry.js";
import { TANSTACK_SERVER_FN_FILE_PATTERN, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartNoDynamicServerFnImport = defineRule<Rule>({
  recommendation:
    "Import server functions statically so bundlers and TanStack can analyze server/client boundaries.",
  examples: [
    {
      before: `export const Route = createFileRoute("/items")({ component: Items });`,
      after: `export const Route = createFileRoute("/items")({ loader, head, component: Items });`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportExpression(node: EsTreeNode) {
      const source = node.source;
      if (!source) return;

      let importPath: string | null = null;
      if (isNodeOfType(source, "Literal") && typeof source.value === "string") {
        importPath = source.value;
      } else if (isNodeOfType(source, "TemplateLiteral") && source.quasis?.length === 1) {
        importPath = source.quasis[0].value?.raw ?? null;
      }

      if (importPath && TANSTACK_SERVER_FN_FILE_PATTERN.test(importPath)) {
        context.report({
          node,
          message:
            "Dynamic import of server functions file - use static imports so the bundler can replace server code with RPC stubs",
        });
      }
    },
  }),
});
