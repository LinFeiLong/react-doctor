import { defineRule } from "../../registry.js";
import {
  HIGH_FREQUENCY_DOM_EVENTS,
  handlerCallsSetState,
  isAddEventListenerCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rerenderTransitionsScroll = defineRule<Rule>({
  recommendation:
    "Use startTransition, throttling, or refs for high-frequency scroll and pointer updates so urgent input is not blocked.",
  examples: [
    {
      before: `onScroll={(event) => setY(event.currentTarget.scrollTop)}`,
      after: `onScroll={(event) => { yRef.current = event.currentTarget.scrollTop; }}`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isAddEventListenerCall(node)) return;
      const eventArg = node.arguments?.[0];
      if (!isNodeOfType(eventArg, "Literal")) return;
      const eventName = eventArg.value;
      if (typeof eventName !== "string" || !HIGH_FREQUENCY_DOM_EVENTS.has(eventName)) return;

      const handler = node.arguments?.[1];
      if (!handler) return;
      const setStateCall = handlerCallsSetState(handler);
      if (!setStateCall) return;

      // Skip if the setState is already wrapped in startTransition.
      let cursor: EsTreeNode | null = setStateCall.parent ?? null;
      while (cursor && cursor !== handler) {
        if (
          isNodeOfType(cursor, "CallExpression") &&
          isNodeOfType(cursor.callee, "Identifier") &&
          (cursor.callee.name === "startTransition" ||
            cursor.callee.name === "requestAnimationFrame" ||
            cursor.callee.name === "requestIdleCallback")
        ) {
          return;
        }
        cursor = cursor.parent ?? null;
      }

      context.report({
        node: setStateCall,
        message: `setState in a "${eventName}" handler triggers re-renders at scroll/pointer frequency - wrap in startTransition (mark as non-urgent), use useDeferredValue, or stash in a ref + rAF throttle`,
      });
    },
  }),
});
