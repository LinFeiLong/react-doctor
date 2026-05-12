import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  SUBSCRIPTION_METHOD_NAMES,
  getEffectCallback,
  isHookCall,
  walkAst,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const advancedEventHandlerRefs = defineRule<Rule>({
  recommendation:
    "Store event handlers in refs or useEffectEvent when subscriptions need the latest callback without tearing down and re-adding listeners.",
  examples: [
    {
      before: `useEffect(() => window.addEventListener("resize", onResize), [onResize]);`,
      after: `const onResizeRef = useRef(onResize);
useEffect(() => window.addEventListener("resize", () => onResizeRef.current()), []);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
      if ((node.arguments?.length ?? 0) < 2) return;
      const callback = getEffectCallback(node);
      if (!callback) return;
      const depsNode = node.arguments[1];
      if (!isNodeOfType(depsNode, "ArrayExpression") || !depsNode.elements?.length) return;

      const depIdentifierNames = new Set<string>();
      for (const element of depsNode.elements) {
        if (isNodeOfType(element, "Identifier")) depIdentifierNames.add(element.name);
      }
      if (depIdentifierNames.size === 0) return;

      // Look for an addEventListener (etc.) call inside the body whose
      // second argument is one of our deps.
      let registeredHandlerName: string | null = null;
      walkAst(callback.body, (child: EsTreeNode) => {
        if (registeredHandlerName) return;
        if (!isNodeOfType(child, "CallExpression")) return;
        if (!isNodeOfType(child.callee, "MemberExpression")) return;
        if (!isNodeOfType(child.callee.property, "Identifier")) return;
        if (!SUBSCRIPTION_METHOD_NAMES.has(child.callee.property.name)) return;
        const handlerArg = child.arguments?.[1];
        if (!isNodeOfType(handlerArg, "Identifier")) return;
        if (depIdentifierNames.has(handlerArg.name)) {
          registeredHandlerName = handlerArg.name;
        }
      });

      if (registeredHandlerName) {
        context.report({
          node,
          message: `useEffect re-subscribes a "${registeredHandlerName}" listener every time the handler identity changes - store the handler in a ref and have the listener read \`handlerRef.current()\`, then drop it from the deps`,
        });
      }
    },
  }),
});
