import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  areExpressionsStructurallyEqual,
  collectDepIdentifierNames,
  collectUseStateBindings,
  createComponentPropStackTracker,
  getEffectCallback,
  isHookCall,
  walkInsideStatementBlocks,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const isUndefinedValue = (node: EsTreeNode | undefined): boolean =>
  !node || (isNodeOfType(node, "Identifier") && node.name === "undefined");

const isSameInitialValue = (
  setterArgument: EsTreeNode | undefined,
  initializer: EsTreeNode | undefined,
): boolean => {
  if (isUndefinedValue(setterArgument) && isUndefinedValue(initializer)) return true;
  if (!setterArgument || !initializer) return false;
  return areExpressionsStructurallyEqual(setterArgument, initializer);
};

const hasPropDependency = (
  effectNode: EsTreeNode,
  propNames: ReadonlySet<string>,
): string | null => {
  for (const depName of collectDepIdentifierNames(effectNode)) {
    if (propNames.has(depName)) return depName;
  }
  return null;
};

export const effectNoResetAllStateOnPropChange = defineRule<Rule>({
  recommendation:
    "When a prop represents a new entity, reset the component with a key prop instead of clearing every local state variable from an effect.",
  examples: [
    {
      before: `function Profile({ userId }) {
  const [comment, setComment] = useState("");
  useEffect(() => setComment(""), [userId]);
}`,
      after: `<Profile key={userId} userId={userId} />`,
    },
  ],
  create: (context: RuleContext) => {
    const propTracker = createComponentPropStackTracker();

    return {
      ...propTracker.visitors,
      CallExpression(node: EsTreeNode) {
        if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
        const propNames = propTracker.getCurrentPropNames();
        const propName = hasPropDependency(node, propNames);
        if (!propName) return;
        const callback = getEffectCallback(node);
        if (!callback) return;
        const componentBody = node.parent?.parent;
        if (!isNodeOfType(componentBody, "BlockStatement")) return;
        const stateBindings = collectUseStateBindings(componentBody);
        if (stateBindings.length === 0) return;
        const resetSetterNames = new Set<string>();

        walkInsideStatementBlocks(callback.body, (child) => {
          if (!isNodeOfType(child, "CallExpression")) return;
          if (!isNodeOfType(child.callee, "Identifier")) return;
          const binding = stateBindings.find(
            (stateBinding) => stateBinding.setterName === child.callee.name,
          );
          if (!binding) return;
          const initializer = binding.declarator.init?.arguments?.[0];
          if (isSameInitialValue(child.arguments?.[0], initializer)) {
            resetSetterNames.add(binding.setterName);
          }
        });

        if (resetSetterNames.size !== stateBindings.length) return;
        context.report({
          node,
          message: `effect resets all local state when prop "${propName}" changes - pass that value as a key so React resets the component state`,
        });
      },
    };
  },
});
