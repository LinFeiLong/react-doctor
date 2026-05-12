import { defineRule } from "../../registry.js";
import { collectIdentifierNames, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const asyncCheapConditionBeforeAwait = defineRule<Rule>({
  recommendation:
    "Check cheap synchronous guards before awaiting expensive work so the cold path can return without starting unnecessary async operations.",
  examples: [
    {
      before: `const user = await getUser();
if (enabled && user.active) return user;`,
      after: `if (!enabled) return null;
const user = await getUser();`,
    },
  ],
  create: (context: RuleContext) => {
    const awaitedBindings = new Set<string>();

    return {
      VariableDeclarator(node: EsTreeNode) {
        if (!isNodeOfType(node.id, "Identifier")) return;
        if (!isNodeOfType(node.init, "AwaitExpression")) return;
        awaitedBindings.add(node.id.name);
      },
      IfStatement(node: EsTreeNode) {
        if (!isNodeOfType(node.test, "LogicalExpression")) return;
        if (node.test.operator !== "&&" && node.test.operator !== "||") return;

        const leftNames = new Set<string>();
        const rightNames = new Set<string>();
        collectIdentifierNames(node.test.left, leftNames);
        collectIdentifierNames(node.test.right, rightNames);

        const leftUsesAwaited = [...awaitedBindings].some((name) => leftNames.has(name));
        const rightUsesAwaited = [...awaitedBindings].some((name) => rightNames.has(name));
        if (!leftUsesAwaited || rightUsesAwaited) return;

        context.report({
          node,
          message:
            "awaited flag is checked before a cheap synchronous condition - check the local condition first so the async work is skipped on the cold path",
        });
      },
    };
  },
});
