import { defineRule } from "../../registry.js";
import { EFFECT_HOOK_NAMES, isHookCall, walkAst, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const appInitCallPattern =
  /(?:^init|initialize|setup|configure|loadFromStorage|checkAuth|hydrate|bootstrap)/i;

export const advancedInitOnce = defineRule<Rule>({
  recommendation:
    "Move app-wide initialization to module scope or guard it with a module-level flag so remounts and Strict Mode do not initialize twice.",
  examples: [
    {
      before: `useEffect(() => initializeAnalytics(), []);`,
      after: `let didInitialize = false;
if (!didInitialize) { initializeAnalytics(); didInitialize = true; }`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
      const deps = node.arguments?.[1];
      if (!isNodeOfType(deps, "ArrayExpression") || (deps.elements?.length ?? 0) !== 0) return;
      const callback = node.arguments?.[0];
      if (!callback) return;
      let initCall: EsTreeNode | null = null;
      walkAst(callback, (child: EsTreeNode) => {
        if (initCall) return false;
        if (!isNodeOfType(child, "CallExpression")) return;
        const callee = child.callee;
        const calleeName = isNodeOfType(callee, "Identifier")
          ? callee.name
          : isNodeOfType(callee, "MemberExpression") && isNodeOfType(callee.property, "Identifier")
            ? callee.property.name
            : null;
        if (calleeName && appInitCallPattern.test(calleeName)) initCall = child;
      });
      if (!initCall) return;
      context.report({
        node: initCall,
        message:
          "app-wide initialization in useEffect([]) can run again on remount or Strict Mode - guard it at module scope or move initialization to the app entry",
      });
    },
  }),
});
