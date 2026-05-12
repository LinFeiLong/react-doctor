import { defineRule } from "../../registry.js";
import { isSetterCall, isSetterIdentifier, walkAst, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const isZeroDelayTimer = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node.callee, "Identifier") || node.callee.name !== "setTimeout") return false;
  const delay = node.arguments?.[1];
  if (!delay) return true;
  return isNodeOfType(delay, "Literal") && delay.value === 0;
};

const callbackContainsStateSetter = (callback: EsTreeNode | undefined): boolean => {
  if (!callback) return false;
  if (isNodeOfType(callback, "Identifier") && isSetterIdentifier(callback.name)) return true;
  let didFindSetter = false;
  walkAst(callback, (child) => {
    if (didFindSetter) return false;
    if (child !== callback && isNodeOfType(child, "FunctionExpression")) return false;
    if (child !== callback && isNodeOfType(child, "ArrowFunctionExpression")) return false;
    if (isSetterCall(child)) {
      didFindSetter = true;
      return false;
    }
  });
  return didFindSetter;
};

export const noSettimeoutStateFix = defineRule<Rule>({
  recommendation:
    "Do not defer React state with setTimeout(..., 0) to make ordering bugs disappear; move the update to the real event/lifecycle boundary and verify the original race or render loop is gone.",
  examples: [
    {
      before: `setTimeout(() => setOpen(false), 0);`,
      after: `const handleClose = () => setOpen(false);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isZeroDelayTimer(node)) return;
      if (!callbackContainsStateSetter(node.arguments?.[0])) return;
      context.report({
        node,
        message:
          "setTimeout(..., 0) around a React state update hides ordering bugs - update at the actual event or lifecycle boundary instead",
      });
    },
  }),
});
