import { defineRule } from "../../registry.js";
import { EFFECT_HOOK_NAMES, isHookCall, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const splitCandidateHookNames = new Set(["useMemo", "useCallback", ...EFFECT_HOOK_NAMES]);

export const rerenderSplitCombinedHooks = defineRule<Rule>({
  recommendation:
    "Split hook callbacks that do unrelated work with different dependencies so one dependency change does not rerun everything.",
  examples: [
    {
      before: `useMemo(() => ({ filtered: filter(items), sorted: sort(other) }), [items, other]);`,
      after: `const filtered = useMemo(() => filter(items), [items]);
const sorted = useMemo(() => sort(other), [other]);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, splitCandidateHookNames)) return;
      const callback = node.arguments?.[0];
      const deps = node.arguments?.[1];
      if (!isNodeOfType(callback.body, "BlockStatement")) return;
      if (!isNodeOfType(deps, "ArrayExpression") || (deps.elements?.length ?? 0) < 2) return;
      const meaningfulStatements = (callback.body.body ?? []).filter(
        (statement: EsTreeNode) => !isNodeOfType(statement, "EmptyStatement"),
      );
      if (meaningfulStatements.length < 2) return;
      context.report({
        node,
        message:
          "hook callback performs multiple steps with multiple dependencies - split independent work into separate hooks so one dependency change does not rerun unrelated work",
      });
    },
  }),
});
