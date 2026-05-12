import { defineRule } from "../../registry.js";
import {
  AUTH_CHECK_LOOKAHEAD_STATEMENTS,
  containsAuthCheck,
  hasDirective,
  hasUseServerDirective,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const serverAuthActions = defineRule<Rule>({
  recommendation:
    "Authenticate and authorize every server action or mutating route handler before reading user input or performing writes.",
  examples: [
    {
      before: `export async function save(data) { await db.save(data); }`,
      after: `export async function save(data) { const user = await auth(); await db.save({ userId: user.id, data }); }`,
    },
  ],
  create: (context: RuleContext) => {
    let fileHasUseServerDirective = false;

    return {
      Program(programNode: EsTreeNode) {
        fileHasUseServerDirective = hasDirective(programNode, "use server");
      },
      ExportNamedDeclaration(node: EsTreeNode) {
        const declaration = node.declaration;
        if (!isNodeOfType(declaration, "FunctionDeclaration") || !declaration.async) return;

        const isServerAction = fileHasUseServerDirective || hasUseServerDirective(declaration);
        if (!isServerAction) return;

        const firstStatements = (declaration.body?.body ?? []).slice(
          0,
          AUTH_CHECK_LOOKAHEAD_STATEMENTS,
        );
        if (!containsAuthCheck(firstStatements)) {
          const functionName = declaration.id?.name ?? "anonymous";
          context.report({
            node: declaration.id ?? node,
            message: `Server action "${functionName}" - add auth check (auth(), getSession(), etc.) at the top`,
          });
        }
      },
    };
  },
});
