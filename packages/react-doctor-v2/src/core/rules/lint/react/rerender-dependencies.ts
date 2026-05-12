import { defineRule } from "../../registry.js";
import { HOOKS_WITH_DEPS, isHookCall, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rerenderDependencies = defineRule<Rule>({
  recommendation:
    "Depend on primitives or stable memoized values instead of fresh objects, arrays, and functions in hook dependency arrays.",
  examples: [
    {
      before: `useEffect(sync, [user]);`,
      after: `useEffect(sync, [user.id]);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, HOOKS_WITH_DEPS) || node.arguments.length < 2) return;
      const depsNode = node.arguments[1];
      if (!isNodeOfType(depsNode, "ArrayExpression")) return;

      for (const element of depsNode.elements ?? []) {
        if (!element) continue;
        if (isNodeOfType(element, "ObjectExpression")) {
          context.report({
            node: element,
            message:
              "Object literal in useEffect deps - creates new reference every render, causing infinite re-runs",
          });
        }
        if (isNodeOfType(element, "ArrayExpression")) {
          context.report({
            node: element,
            message:
              "Array literal in useEffect deps - creates new reference every render, causing infinite re-runs",
          });
        }
        // HACK: arrow / function expressions create a fresh function
        // reference every render, same problem as object/array literals.
        // The fix is to either lift the function out of the component
        // (if it doesn't read reactive values) or wrap it in
        // `useCallback`. Covered by `Removing Effect Dependencies` §
        // "Does some reactive value change unintentionally?".
        if (
          isNodeOfType(element, "ArrowFunctionExpression") ||
          isNodeOfType(element, "FunctionExpression")
        ) {
          context.report({
            node: element,
            message:
              "Inline function in useEffect deps - creates a new function reference every render, causing infinite re-runs. Hoist it out of the component or wrap it with useCallback",
          });
        }
      }
    },
  }),
});
