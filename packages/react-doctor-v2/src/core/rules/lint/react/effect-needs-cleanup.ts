import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  effectHasCleanupRelease,
  findSubscribeLikeUsages,
  getEffectCallback,
  isHookCall,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const effectNeedsCleanup = defineRule<Rule>({
  recommendation:
    "Return cleanup from effects that register timers, subscriptions, listeners, observers, or async resources.",
  examples: [
    {
      before: `useEffect(() => { window.addEventListener("resize", onResize); }, []);`,
      after: `useEffect(() => { window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize); }, []);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
      const callback = getEffectCallback(node);
      if (!callback) return;

      const usages = findSubscribeLikeUsages(callback);
      if (usages.length === 0) return;

      if (effectHasCleanupRelease(callback)) return;

      const firstUsage = usages[0];
      const verb = firstUsage.kind === "timer" ? "schedules" : "subscribes via";
      const release =
        firstUsage.kind === "timer"
          ? `clear${firstUsage.resourceName === "setInterval" ? "Interval" : "Timeout"}(...)`
          : "the matching remove/unsubscribe call";
      context.report({
        node,
        message: `useEffect ${verb} \`${firstUsage.resourceName}(...)\` but never returns a cleanup - leaks the registration on every re-run and on unmount. Return a cleanup function that calls ${release}`,
      });
    },
  }),
});
