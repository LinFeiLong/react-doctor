import { defineRule } from "../../registry.js";
import { LOADING_STATE_PATTERN, isHookCall, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const renderingUsetransitionLoading = defineRule<Rule>({
  recommendation:
    "Use useTransition for non-urgent UI state and loading indicators so the current screen stays interactive during the transition.",
  examples: [
    {
      before: `const [loading, setLoading] = useState(false);`,
      after: `const [isPending, startTransition] = useTransition();`,
    },
  ],
  create: (context: RuleContext) => ({
    VariableDeclarator(node: EsTreeNode) {
      if (!isNodeOfType(node.id, "ArrayPattern") || !node.id.elements?.length) return;
      if (!node.init || !isHookCall(node.init, "useState")) return;
      if (!node.init.arguments?.length) return;

      const initializer = node.init.arguments[0];
      if (!isNodeOfType(initializer, "Literal") || initializer.value !== false) return;

      const stateVariableName = node.id.elements[0]?.name;
      if (!stateVariableName || !LOADING_STATE_PATTERN.test(stateVariableName)) return;

      context.report({
        node: node.init,
        message: `useState for "${stateVariableName}" - if this guards a state transition (not an async fetch), consider useTransition instead`,
      });
    },
  }),
});
