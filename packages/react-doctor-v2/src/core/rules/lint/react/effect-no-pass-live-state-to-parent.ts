import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  collectUseStateBindings,
  collectValueIdentifierNames,
  createComponentPropStackTracker,
  getEffectCallback,
  isHookCall,
  walkInsideStatementBlocks,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const isCallbackPropName = (name: string): boolean => /^on[A-Z]/.test(name);

export const effectNoPassLiveStateToParent = defineRule<Rule>({
  recommendation:
    "Do not notify parents about every live state change from an effect; lift that state to the parent or return it from the custom hook.",
  examples: [
    {
      before: `const [value, setValue] = useState("");
useEffect(() => onChange(value), [value]);`,
      after: `const [value, setValue] = useState("");
<Child value={value} onChange={setValue} />`,
    },
  ],
  create: (context: RuleContext) => {
    const propTracker = createComponentPropStackTracker();

    return {
      ...propTracker.visitors,
      CallExpression(node: EsTreeNode) {
        if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
        const propNames = propTracker.getCurrentPropNames();
        if (propNames.size === 0) return;
        const callbackPropNames = new Set([...propNames].filter(isCallbackPropName));
        if (callbackPropNames.size === 0) return;
        const componentBody = node.parent?.parent;
        if (!isNodeOfType(componentBody, "BlockStatement")) return;
        const stateNames = new Set(
          collectUseStateBindings(componentBody).map((binding) => binding.valueName),
        );
        if (stateNames.size === 0) return;
        const callback = getEffectCallback(node);
        if (!callback) return;

        walkInsideStatementBlocks(callback.body, (child) => {
          if (!isNodeOfType(child, "CallExpression")) return;
          if (
            !isNodeOfType(child.callee, "Identifier") ||
            !callbackPropNames.has(child.callee.name)
          )
            return;
          const argumentNames: string[] = [];
          for (const argument of child.arguments ?? []) {
            collectValueIdentifierNames(argument, argumentNames);
          }
          if (!argumentNames.some((name) => stateNames.has(name))) return;
          context.report({
            node: child,
            message: `effect passes live state to parent callback "${child.callee.name}" - lift the state up instead of syncing it after render`,
          });
        });
      },
    };
  },
});
