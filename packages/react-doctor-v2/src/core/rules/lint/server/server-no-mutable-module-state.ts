import { defineRule } from "../../registry.js";
import { hasDirective, isMutableConstInitializer, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const serverNoMutableModuleState = defineRule<Rule>({
  recommendation:
    "Avoid mutable module-level state on the server; use request scope, durable storage, or a bounded cache with invalidation.",
  examples: [
    {
      before: `let currentUser;`,
      after: `const currentUser = await getCurrentUser(request);`,
    },
  ],
  create: (context: RuleContext) => {
    let fileHasUseServerDirective = false;

    return {
      Program(programNode: EsTreeNode) {
        fileHasUseServerDirective = hasDirective(programNode, "use server");
      },
      VariableDeclaration(node: EsTreeNode) {
        if (!fileHasUseServerDirective) return;
        if (!isNodeOfType(node.parent, "Program")) return;

        for (const declarator of node.declarations ?? []) {
          const variableName = isNodeOfType(declarator.id, "Identifier")
            ? declarator.id.name
            : "<unnamed>";

          if (node.kind === "let" || node.kind === "var") {
            context.report({
              node: declarator,
              message: `Module-scoped ${node.kind} "${variableName}" in a "use server" file - this is shared across requests; move per-request data into the action body`,
            });
            continue;
          }

          // const + mutable container - same hazard, the binding is fixed
          // but the contents leak across requests.
          const containerKind = isMutableConstInitializer(declarator.init);
          if (containerKind) {
            context.report({
              node: declarator,
              message: `Module-scoped const "${variableName} = ${containerKind}" in a "use server" file - the container itself is shared across requests; move per-request data into the action body`,
            });
          }
        }
      },
    };
  },
});
