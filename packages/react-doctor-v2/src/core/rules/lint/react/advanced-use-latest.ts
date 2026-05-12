import { defineRule } from "../../registry.js";
import { EFFECT_HOOK_NAMES, isHookCall, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const advancedUseLatest = defineRule<Rule>({
  recommendation:
    "Wrap callback props with useEffectEvent or a useLatest ref and call the latest value from subscriptions instead of re-subscribing on every render.",
  examples: [
    {
      before: `useEffect(() => socket.on("message", onMessage), [onMessage]);`,
      after: `const onMessageEvent = useEffectEvent(onMessage);
useEffect(() => socket.on("message", onMessageEvent), []);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
      const deps = node.arguments?.[1];
      if (!isNodeOfType(deps, "ArrayExpression")) return;
      for (const dependency of deps.elements ?? []) {
        if (!isNodeOfType(dependency, "Identifier")) continue;
        if (!/^on[A-Z]/.test(dependency.name) && !/callback|handler/i.test(dependency.name))
          continue;
        context.report({
          node: dependency,
          message: `"${dependency.name}" in effect deps looks like a callback prop - wrap it with useEffectEvent/useLatest and call the latest ref from the subscription instead of re-subscribing`,
        });
      }
    },
  }),
});
