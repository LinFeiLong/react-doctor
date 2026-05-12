import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  getEffectCallback,
  isHookCall,
  isSetterCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const renderingHydrationNoFlicker = defineRule<Rule>({
  recommendation:
    "Read client-only values before hydration with an inline script or server-provided value; do not mask the flash with suppressHydrationWarning or a mount-only effect.",
  examples: [
    {
      before: `useEffect(() => setTheme(localStorage.theme), []);`,
      after: `<script dangerouslySetInnerHTML={{ __html: "document.documentElement.dataset.theme=localStorage.theme" }} />`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES) || (node.arguments?.length ?? 0) < 2) return;

      const depsNode = node.arguments[1];
      if (!isNodeOfType(depsNode, "ArrayExpression") || depsNode.elements?.length !== 0) return;

      const callback = getEffectCallback(node);
      if (!callback) return;

      const bodyStatements = isNodeOfType(callback.body, "BlockStatement")
        ? callback.body.body
        : [callback.body];
      if (!bodyStatements || bodyStatements.length !== 1) return;

      const soleStatement = bodyStatements[0];
      if (
        isNodeOfType(soleStatement, "ExpressionStatement") &&
        isSetterCall(soleStatement.expression)
      ) {
        context.report({
          node,
          message:
            "useEffect(setState, []) on mount causes a flash - read the value before hydration or provide a stable server value instead of masking the mismatch",
        });
      }
    },
  }),
});
