import { defineRule } from "../../registry.js";
import { isUseFrameCall, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const r3fNoCloneInFrame = defineRule<Rule>({
  recommendation:
    "Do not call .clone() inside useFrame; clone allocates every frame, so copy into a reused object instead.",
  examples: [
    {
      before: `useFrame(() => { target.current = position.clone(); });`,
      after: `useFrame(() => { target.current.copy(position); });`,
    },
  ],
  create: (context: RuleContext) => {
    let frameDepth = 0;

    return {
      CallExpression(node: EsTreeNode) {
        if (isUseFrameCall(node)) {
          frameDepth++;
          return;
        }
        if (frameDepth === 0) return;
        if (!isNodeOfType(node.callee, "MemberExpression")) return;
        if (
          !isNodeOfType(node.callee.property, "Identifier") ||
          node.callee.property.name !== "clone"
        )
          return;
        context.report({
          node,
          message:
            ".clone() inside useFrame allocates every frame - copy into a reused vector/object instead",
        });
      },
      "CallExpression:exit"(node: EsTreeNode) {
        if (isUseFrameCall(node)) frameDepth = Math.max(0, frameDepth - 1);
      },
    };
  },
});
