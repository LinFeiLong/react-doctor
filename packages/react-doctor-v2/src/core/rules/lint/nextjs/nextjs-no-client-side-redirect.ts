import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  PAGES_DIRECTORY_PATTERN,
  describeClientSideNavigation,
  getEffectCallback,
  isHookCall,
  walkAst,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsNoClientSideRedirect = defineRule<Rule>({
  recommendation:
    "Use redirect from a Server Component, server action, or route handler when navigation is decided by server data.",
  examples: [
    {
      before: `useEffect(() => { if (!user) router.replace("/login"); }, [user]);`,
      after: `if (!user) redirect("/login");`,
    },
  ],
  create: (context: RuleContext) => {
    const filename = context.getFilename?.() ?? "";
    const isPagesRouterFile = PAGES_DIRECTORY_PATTERN.test(filename);

    return {
      CallExpression(node: EsTreeNode) {
        if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
        const callback = getEffectCallback(node);
        if (!callback) return;

        walkAst(callback, (child: EsTreeNode) => {
          const navigationDescription = describeClientSideNavigation(child, isPagesRouterFile);
          if (navigationDescription) {
            context.report({
              node: child,
              message: navigationDescription,
            });
          }
        });
      },
    };
  },
});
