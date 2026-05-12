import { defineRule } from "../../registry.js";
import {
  areExpressionsStructurallyEqual,
  cleanupReleasesSubscription,
  collectUseStateBindings,
  findSubscriptionCall,
  findUseEffectsInComponent,
  getEffectCallback,
  getSingleSetterCallFromHandler,
  getSubscriptionHandlerArgument,
  isComponentAssignment,
  isUppercaseName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const preferUseSyncExternalStore = defineRule<Rule>({
  recommendation:
    "Subscribe to external stores with useSyncExternalStore so concurrent rendering gets consistent snapshots and cleanup.",
  examples: [
    {
      before: `useEffect(() => store.subscribe(forceUpdate), []);`,
      after: `const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);`,
    },
  ],
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || !isNodeOfType(componentBody, "BlockStatement")) return;

      const useStateBindings = collectUseStateBindings(componentBody);
      if (useStateBindings.length === 0) return;

      const useStateInitializerByValueName = new Map<string, EsTreeNode>();
      for (const binding of useStateBindings) {
        const useStateCall = binding.declarator.init;
        const initializerArgument = useStateCall?.arguments?.[0];
        if (!initializerArgument) continue;
        // HACK: useState(() => getSnapshot()) - unwrap the lazy
        // initializer so the structural match against the
        // subscribe-handler's setter argument still resolves.
        if (
          (isNodeOfType(initializerArgument, "ArrowFunctionExpression") ||
            isNodeOfType(initializerArgument, "FunctionExpression")) &&
          !isNodeOfType(initializerArgument.body, "BlockStatement")
        ) {
          useStateInitializerByValueName.set(binding.valueName, initializerArgument.body);
        } else {
          useStateInitializerByValueName.set(binding.valueName, initializerArgument);
        }
      }

      const setterNameToValueName = new Map<string, string>();
      for (const binding of useStateBindings) {
        setterNameToValueName.set(binding.setterName, binding.valueName);
      }

      for (const effectCall of findUseEffectsInComponent(componentBody)) {
        if ((effectCall.arguments?.length ?? 0) < 2) continue;
        const depsNode = effectCall.arguments[1];
        if (!isNodeOfType(depsNode, "ArrayExpression")) continue;
        if ((depsNode.elements?.length ?? 0) !== 0) continue;

        const callback = getEffectCallback(effectCall);
        if (!callback || !isNodeOfType(callback.body, "BlockStatement")) continue;
        const effectBodyStatements = callback.body.body ?? [];
        if (effectBodyStatements.length < 2) continue;

        const subscription = findSubscriptionCall(effectBodyStatements);
        if (!subscription) continue;

        const handler = getSubscriptionHandlerArgument(subscription.call, effectBodyStatements);
        if (!handler) continue;

        const setterPayload = getSingleSetterCallFromHandler(handler);
        if (!setterPayload) continue;

        const valueName = setterNameToValueName.get(setterPayload.setterName);
        if (!valueName) continue;

        const useStateInitializer = useStateInitializerByValueName.get(valueName);
        if (!useStateInitializer) continue;

        if (!areExpressionsStructurallyEqual(useStateInitializer, setterPayload.setterArgument)) {
          continue;
        }

        if (!cleanupReleasesSubscription(effectBodyStatements, subscription.boundUnsubscribeName)) {
          continue;
        }

        const matchingBinding = useStateBindings.find((binding) => binding.valueName === valueName);
        context.report({
          node: matchingBinding?.declarator ?? effectCall,
          message: `useState "${valueName}" is synchronized with an external store via useEffect - replace this useState + useEffect pair with useSyncExternalStore(subscribe, getSnapshot) to avoid tearing during concurrent renders`,
        });
      }
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        checkComponent(node.body);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        checkComponent(node.init?.body);
      },
    };
  },
});
