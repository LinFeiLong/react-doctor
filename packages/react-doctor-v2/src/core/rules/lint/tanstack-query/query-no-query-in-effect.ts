import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  getEffectCallback,
  isHookCall,
  isNodeOfType,
  walkAst,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const queryNoQueryInEffect = defineRule<Rule>({
  recommendation:
    "Call query hooks during render and use enabled or dependent queries instead of starting queries inside effects.",
  examples: [
    {
      before: `const result = useQuery({ queryKey: ["items"], queryFn: saveItem });`,
      after: `const mutation = useMutation({ mutationFn: saveItem, onSuccess: invalidateItems });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;

      const callback = getEffectCallback(node);
      if (!callback) return;

      walkAst(callback, (child: EsTreeNode) => {
        if (!isNodeOfType(child, "CallExpression")) return;

        const calleeName = isNodeOfType(child.callee, "Identifier") ? child.callee.name : null;

        if (calleeName === "refetch") {
          context.report({
            node: child,
            message:
              "refetch() inside useEffect - React Query manages refetching automatically. Use queryKey dependencies or the enabled option instead",
          });
        }
      });
    },
  }),
});
