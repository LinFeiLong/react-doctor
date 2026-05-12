import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  REACT_HANDLER_PROP_PATTERN,
  classifyCallableReadsInsideEffect,
  collectFunctionTypedLocalBindings,
  createComponentPropStackTracker,
  getEffectCallback,
  isHookCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const preferUseEffectEvent = defineRule<Rule>({
  recommendation:
    "Use useEffectEvent for non-reactive logic read from an effect, especially callbacks that need latest props without re-subscribing.",
  examples: [
    {
      before: `useEffect(() => { log(cart.length); }, [cart, log]);`,
      after: `const logEvent = useEffectEvent(log);
useEffect(() => { logEvent(cart.length); }, [cart]);`,
    },
  ],
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | undefined): void => {
      if (!componentBody || !isNodeOfType(componentBody, "BlockStatement")) return;
      const functionTypedLocalBindings = collectFunctionTypedLocalBindings(componentBody);

      for (const statement of componentBody.body ?? []) {
        if (!isNodeOfType(statement, "ExpressionStatement")) continue;
        const effectCall = statement.expression;
        if (!isNodeOfType(effectCall, "CallExpression")) continue;
        if (!isHookCall(effectCall, EFFECT_HOOK_NAMES)) continue;
        if ((effectCall.arguments?.length ?? 0) < 2) continue;

        const depsNode = effectCall.arguments[1];
        if (!isNodeOfType(depsNode, "ArrayExpression")) continue;
        const depElements = depsNode.elements ?? [];
        if (depElements.length < 2) continue;
        if (
          !depElements.every((element: EsTreeNode | null) => isNodeOfType(element, "Identifier"))
        ) {
          continue;
        }

        const callback = getEffectCallback(effectCall);
        if (!callback) continue;

        for (const depElement of depElements) {
          if (!depElement) continue;
          const depName: string = depElement.name;
          // HACK: a destructured prop is treated as function-typed
          // ONLY if its name matches the React `on[A-Z]` callback
          // convention. Without this filter the rule false-positived
          // on scalar props.
          const isFunctionTypedPropDep =
            propStackTracker.isPropName(depName) && REACT_HANDLER_PROP_PATTERN.test(depName);
          const isFunctionTypedLocalDep = functionTypedLocalBindings.has(depName);
          if (!isFunctionTypedPropDep && !isFunctionTypedLocalDep) continue;

          const classification = classifyCallableReadsInsideEffect(depName, callback);
          if (!classification.hasAnyRead) continue;
          if (!classification.allReadsAreInSubHandlers) continue;

          const subHandlerLabel = classification.firstSubHandlerName
            ? `\`${classification.firstSubHandlerName}\``
            : "an async sub-handler";
          context.report({
            node: depElement,
            message: `"${depName}" is read only inside ${subHandlerLabel} - wrap it with useEffectEvent and remove it from the dep array so the effect doesn't re-synchronize on every parent render`,
          });
        }
      }
    };

    const propStackTracker = createComponentPropStackTracker({
      onComponentEnter: checkComponent,
    });

    return propStackTracker.visitors;
  },
});
