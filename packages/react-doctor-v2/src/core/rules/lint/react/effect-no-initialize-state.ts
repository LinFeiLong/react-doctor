import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  collectDepIdentifierNames,
  collectUseStateBindings,
  getEffectCallback,
  isHookCall,
  isSetterIdentifier,
  walkInsideStatementBlocks,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const effectNoInitializeState = defineRule<Rule>({
  recommendation:
    "Initialize useState with the value you need instead of rendering once with empty state and filling it from a mount-only effect; use useSyncExternalStore for SSR-sensitive browser values.",
  examples: [
    {
      before: `const [name, setName] = useState("");
useEffect(() => setName(initialName), []);`,
      after: `const [name, setName] = useState(initialName);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
      const depNames = collectDepIdentifierNames(node);
      const nonSetterDeps = [...depNames].filter((name) => !isSetterIdentifier(name));
      if (nonSetterDeps.length > 0) return;
      const callback = getEffectCallback(node);
      if (!callback) return;
      const componentBody = node.parent?.parent;
      if (!isNodeOfType(componentBody, "BlockStatement")) return;
      const setterToStateName = new Map(
        collectUseStateBindings(componentBody).map((binding) => [
          binding.setterName,
          binding.valueName,
        ]),
      );

      walkInsideStatementBlocks(callback.body, (child) => {
        if (!isNodeOfType(child, "CallExpression")) return;
        if (!isNodeOfType(child.callee, "Identifier")) return;
        const stateName = setterToStateName.get(child.callee.name);
        if (!stateName) return;
        context.report({
          node: child,
          message: `state "${stateName}" is initialized from a mount-only effect - pass the initial value to useState instead`,
        });
      });
    },
  }),
});
