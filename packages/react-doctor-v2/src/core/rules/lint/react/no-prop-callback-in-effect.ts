import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  createComponentPropStackTracker,
  getEffectCallback,
  isHookCall,
  walkInsideStatementBlocks,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noPropCallbackInEffect = defineRule<Rule>({
  recommendation:
    "Wrap callback props with useEffectEvent/useLatest or call them from the originating event so effects do not re-run only because callback identity changed.",
  examples: [
    {
      before: `useEffect(() => { socket.on("done", onDone); }, [onDone]);`,
      after: `const onDoneEvent = useEffectEvent(onDone);
useEffect(() => socket.on("done", onDoneEvent), []);`,
    },
  ],
  create: (context: RuleContext) => {
    const propStackTracker = createComponentPropStackTracker();

    return {
      ...propStackTracker.visitors,
      CallExpression(node: EsTreeNode) {
        if (!isHookCall(node, EFFECT_HOOK_NAMES) || (node.arguments?.length ?? 0) < 2) return;
        const callback = getEffectCallback(node);
        if (!callback) return;
        const depsNode = node.arguments[1];
        if (!isNodeOfType(depsNode, "ArrayExpression") || !depsNode.elements?.length) return;

        // Only flag if at least one dep is a non-prop (state-shape)
        // identifier - otherwise the effect is just adapting to prop
        // changes (legit pattern).
        const hasStateLikeDep = depsNode.elements.some(
          (element: EsTreeNode) =>
            isNodeOfType(element, "Identifier") && !propStackTracker.isPropName(element.name),
        );
        if (!hasStateLikeDep) return;

        // HACK: walk control-flow descendants (`if`, `try`, `for`,
        // `switch`) but stop at any nested function boundary so calls
        // inside `setTimeout(() => onChange(state))` aren't conflated
        // with the top-level `onChange(state)` shape - those belong to
        // `prefer-use-effect-event` (sub-handler reads), not this rule
        // (lift state via callback).
        const reportedNodes = new Set<EsTreeNode>();
        walkInsideStatementBlocks(callback.body, (child: EsTreeNode) => {
          if (!isNodeOfType(child, "CallExpression")) return;
          if (!isNodeOfType(child.callee, "Identifier")) return;
          const calleeName = child.callee.name;
          if (!propStackTracker.isPropName(calleeName)) return;
          if (reportedNodes.has(child)) return;
          reportedNodes.add(child);
          context.report({
            node: child,
            message: `useEffect calls prop callback "${calleeName}" with local state in deps - this is the "lift state via callback" anti-pattern; lift state into a shared Provider so both sides read the same source`,
          });
        });
      },
    };
  },
});
