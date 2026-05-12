import { defineRule } from "../../registry.js";
import { TRIVIAL_INITIALIZER_NAMES, isHookCall, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rerenderLazyStateInit = defineRule<Rule>({
  recommendation:
    "Pass expensive initial state as a function to useState so React computes it only on initial mount.",
  examples: [
    {
      before: `const [index] = useState(buildIndex(items));`,
      after: `const [index] = useState(() => buildIndex(items));`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, "useState") || !node.arguments?.length) return;
      const initializer = node.arguments[0];
      if (!isNodeOfType(initializer, "CallExpression")) return;

      const calleeName = isNodeOfType(initializer.callee, "Identifier")
        ? initializer.callee.name
        : (initializer.callee?.property?.name ?? "fn");

      if (TRIVIAL_INITIALIZER_NAMES.has(calleeName)) return;

      context.report({
        node: initializer,
        message: `useState(${calleeName}()) calls initializer on every render - use useState(() => ${calleeName}()) for lazy initialization`,
      });
    },
  }),
});
