import { defineRule } from "../../registry.js";
import {
  STABLE_HOOK_WRAPPERS,
  TANSTACK_QUERY_CLIENT_CLASS,
  UPPERCASE_PATTERN,
  isHookCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const queryStableQueryClient = defineRule<Rule>({
  recommendation:
    "Create QueryClient once at module scope, lazy state initialization, or a provider boundary instead of recreating it on every render.",
  examples: [
    {
      before: `const result = useQuery({ queryKey: ["items"], queryFn: saveItem });`,
      after: `const mutation = useMutation({ mutationFn: saveItem, onSuccess: invalidateItems });`,
    },
  ],
  create: (context: RuleContext) => {
    let componentDepth = 0;
    let stableHookDepth = 0;

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (node.id?.name && UPPERCASE_PATTERN.test(node.id.name)) {
          componentDepth++;
        }
      },
      "FunctionDeclaration:exit"(node: EsTreeNode) {
        if (node.id?.name && UPPERCASE_PATTERN.test(node.id.name)) {
          componentDepth--;
        }
      },
      VariableDeclarator(node: EsTreeNode) {
        if (
          isNodeOfType(node.id, "Identifier") &&
          UPPERCASE_PATTERN.test(node.id.name) &&
          (isNodeOfType(node.init, "ArrowFunctionExpression") ||
            isNodeOfType(node.init, "FunctionExpression"))
        ) {
          componentDepth++;
        }
      },
      "VariableDeclarator:exit"(node: EsTreeNode) {
        if (
          isNodeOfType(node.id, "Identifier") &&
          UPPERCASE_PATTERN.test(node.id.name) &&
          (isNodeOfType(node.init, "ArrowFunctionExpression") ||
            isNodeOfType(node.init, "FunctionExpression"))
        ) {
          componentDepth--;
        }
      },
      CallExpression(node: EsTreeNode) {
        if (isHookCall(node, STABLE_HOOK_WRAPPERS)) {
          stableHookDepth++;
        }
      },
      "CallExpression:exit"(node: EsTreeNode) {
        if (isHookCall(node, STABLE_HOOK_WRAPPERS)) {
          stableHookDepth = Math.max(0, stableHookDepth - 1);
        }
      },
      NewExpression(node: EsTreeNode) {
        if (componentDepth <= 0) return;
        if (stableHookDepth > 0) return;
        if (
          !isNodeOfType(node.callee, "Identifier") ||
          node.callee.name !== TANSTACK_QUERY_CLIENT_CLASS
        )
          return;

        context.report({
          node,
          message:
            "new QueryClient() inside a component - creates a new cache on every render. Move to module scope or wrap in useState(() => new QueryClient())",
        });
      },
    };
  },
});
