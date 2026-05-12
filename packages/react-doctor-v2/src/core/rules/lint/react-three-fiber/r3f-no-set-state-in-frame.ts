import { defineRule } from "../../registry.js";
import { isSetterCall } from "../utils.js";
import { isUseFrameCall } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const r3fNoSetStateInFrame = defineRule<Rule>({
  recommendation:
    "Do not call React state setters inside useFrame; put per-frame values in refs or external stores so the render loop does not force React renders.",
  examples: [
    {
      before: `useFrame(() => setRotation(mesh.current.rotation.y));`,
      after: `useFrame(() => { rotationRef.current = mesh.current.rotation.y; });`,
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
        if (frameDepth === 0 || !isSetterCall(node)) return;
        context.report({
          node,
          message:
            "React state update inside useFrame forces React work at frame rate - use a ref or external store for frame data",
        });
      },
      "CallExpression:exit"(node: EsTreeNode) {
        if (isUseFrameCall(node)) frameDepth = Math.max(0, frameDepth - 1);
      },
    };
  },
});
