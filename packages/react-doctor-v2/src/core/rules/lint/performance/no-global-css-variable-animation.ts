import { defineRule } from "../../registry.js";
import { ANIMATION_CALLBACK_NAMES, isMemberProperty, walkAst, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noGlobalCssVariableAnimation = defineRule<Rule>({
  recommendation:
    "Animate local element styles or transform values instead of global CSS variables that can invalidate large parts of the tree.",
  examples: [
    {
      before: `document.documentElement.style.setProperty("--x", value);`,
      after: `element.style.transform = \`translateX(\${value}px)\`;`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "Identifier")) return;
      if (!ANIMATION_CALLBACK_NAMES.has(node.callee.name)) return;

      const callback = node.arguments?.[0];
      if (!callback) return;

      const calleeName = node.callee.name;
      walkAst(callback, (child: EsTreeNode) => {
        if (!isNodeOfType(child, "CallExpression")) return;
        if (!isMemberProperty(child.callee, "setProperty")) return;
        if (!isNodeOfType(child.arguments?.[0], "Literal")) return;

        const variableName = child.arguments[0].value;
        if (typeof variableName !== "string" || !variableName.startsWith("--")) return;

        context.report({
          node: child,
          message: `CSS variable "${variableName}" updated in ${calleeName} - forces style recalculation on all inheriting elements every frame`,
        });
      });
    },
  }),
});
