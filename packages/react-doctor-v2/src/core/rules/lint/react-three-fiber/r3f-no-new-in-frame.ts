import { defineRule } from "../../registry.js";
import { THREE_ALLOCATING_CONSTRUCTORS, isUseFrameCall, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const r3fNoNewInFrame = defineRule<Rule>({
  recommendation:
    "Do not allocate Three.js objects inside useFrame; reuse refs or module-scope scratch objects so the render loop does not create garbage every frame.",
  examples: [
    {
      before: `useFrame(() => { mesh.position.copy(new Vector3(x, y, z)); });`,
      after: `const scratch = new Vector3();\nuseFrame(() => { mesh.position.copy(scratch.set(x, y, z)); });`,
    },
  ],
  create: (context: RuleContext) => {
    let frameDepth = 0;

    return {
      CallExpression(node: EsTreeNode) {
        if (isUseFrameCall(node)) frameDepth++;
      },
      "CallExpression:exit"(node: EsTreeNode) {
        if (isUseFrameCall(node)) frameDepth = Math.max(0, frameDepth - 1);
      },
      NewExpression(node: EsTreeNode) {
        if (frameDepth === 0) return;
        if (!isNodeOfType(node.callee, "Identifier")) return;
        if (!THREE_ALLOCATING_CONSTRUCTORS.has(node.callee.name)) return;
        context.report({
          node,
          message: `new ${node.callee.name}() inside useFrame allocates every frame - reuse a scratch object or ref`,
        });
      },
    };
  },
});
