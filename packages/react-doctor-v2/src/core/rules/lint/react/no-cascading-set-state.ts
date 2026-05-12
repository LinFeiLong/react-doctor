import { defineRule } from "../../registry.js";
import {
  CASCADING_SET_STATE_THRESHOLD,
  EFFECT_HOOK_NAMES,
  countSetStateCalls,
  getEffectCallback,
  isHookCall,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noCascadingSetState = defineRule<Rule>({
  recommendation:
    "Collapse cascading effects into a single state update, reducer transition, or render-time derivation so one render does not schedule another render chain.",
  examples: [
    {
      before: `useEffect(() => setB(a + 1), [a]);
useEffect(() => setC(b + 1), [b]);`,
      after: `const b = a + 1;
const c = b + 1;`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
      const callback = getEffectCallback(node);
      if (!callback) return;

      const setStateCallCount = countSetStateCalls(callback);
      if (setStateCallCount >= CASCADING_SET_STATE_THRESHOLD) {
        context.report({
          node,
          message: `${setStateCallCount} setState calls in a single useEffect - consider using useReducer or deriving state`,
        });
      }
    },
  }),
});
