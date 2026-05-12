import { defineRule } from "../../registry.js";
import { INTERNAL_PAGE_PATH_PATTERN, PAGE_FILE_PATTERN, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsMissingMetadata = defineRule<Rule>({
  recommendation:
    "Export metadata or generateMetadata from App Router pages and layouts so titles and descriptions are defined server-side.",
  examples: [
    {
      before: `export default function Page() {}`,
      after: `export const metadata = { title: "Dashboard" };`,
    },
  ],
  create: (context: RuleContext) => ({
    Program(programNode: EsTreeNode) {
      const filename = context.getFilename?.() ?? "";
      if (!PAGE_FILE_PATTERN.test(filename)) return;
      if (INTERNAL_PAGE_PATH_PATTERN.test(filename)) return;

      const hasMetadataExport = programNode.body?.some((statement: EsTreeNode) => {
        if (!isNodeOfType(statement, "ExportNamedDeclaration")) return false;
        const declaration = statement.declaration;
        if (isNodeOfType(declaration, "VariableDeclaration")) {
          return declaration.declarations?.some(
            (declarator: EsTreeNode) =>
              isNodeOfType(declarator.id, "Identifier") &&
              (declarator.id.name === "metadata" || declarator.id.name === "generateMetadata"),
          );
        }
        if (isNodeOfType(declaration, "FunctionDeclaration")) {
          return declaration.id?.name === "generateMetadata";
        }
        return false;
      });

      if (!hasMetadataExport) {
        context.report({
          node: programNode,
          message: "Page without metadata or generateMetadata export - hurts SEO",
        });
      }
    },
  }),
});
