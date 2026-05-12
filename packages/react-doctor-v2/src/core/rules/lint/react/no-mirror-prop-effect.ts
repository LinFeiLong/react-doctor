import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  areExpressionsStructurallyEqual,
  createComponentPropStackTracker,
  getCallbackStatements,
  getEffectCallback,
  getPropRootName,
  isHookCall,
  isSetterIdentifier,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, MirrorBinding, Rule, RuleContext } from "./_utils.js";

export const noMirrorPropEffect = defineRule<Rule>({
  recommendation:
    "Use the prop directly, derive a value during render, or make the component controlled instead of mirroring props into local state with an effect.",
  examples: [
    {
      before: `useEffect(() => setValue(propValue), [propValue]);`,
      after: `const value = propValue;`,
    },
  ],
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | undefined): void => {
      if (!componentBody || !isNodeOfType(componentBody, "BlockStatement")) return;
      const propNames = propStackTracker.getCurrentPropNames();
      if (propNames.size === 0) return;

      const mirrorBindings: MirrorBinding[] = [];

      for (const statement of componentBody.body ?? []) {
        if (!isNodeOfType(statement, "VariableDeclaration")) continue;
        for (const declarator of statement.declarations ?? []) {
          if (!isNodeOfType(declarator.id, "ArrayPattern")) continue;
          const elements = declarator.id.elements ?? [];
          if (elements.length < 2) continue;
          const valueElement = elements[0];
          const setterElement = elements[1];
          if (
            !isNodeOfType(valueElement, "Identifier") ||
            !isNodeOfType(setterElement, "Identifier") ||
            !isSetterIdentifier(setterElement.name)
          ) {
            continue;
          }
          if (!isNodeOfType(declarator.init, "CallExpression")) continue;
          if (!isHookCall(declarator.init, "useState")) continue;
          const initializer = declarator.init.arguments?.[0];
          if (!initializer) continue;
          const propRootName = getPropRootName(initializer, propNames);
          if (!propRootName) continue;
          mirrorBindings.push({
            valueName: valueElement.name,
            setterName: setterElement.name,
            initializer,
            propRootName,
          });
        }
      }

      if (mirrorBindings.length === 0) return;

      // HACK: only consider useEffects that are direct top-level
      // statements of the component body. A useEffect inside a nested
      // helper is a rules-of-hooks violation and isn't part of this
      // component's surface - its outer prop set wouldn't apply
      // anyway.
      for (const statement of componentBody.body ?? []) {
        if (!isNodeOfType(statement, "ExpressionStatement")) continue;
        const effectCall = statement.expression;
        if (!isNodeOfType(effectCall, "CallExpression")) continue;
        if (!isHookCall(effectCall, EFFECT_HOOK_NAMES)) continue;
        if ((effectCall.arguments?.length ?? 0) < 2) continue;

        const depsNode = effectCall.arguments[1];
        if (!isNodeOfType(depsNode, "ArrayExpression")) continue;
        // HACK: previously required EXACTLY one dep, which silently
        // missed the legitimate `useEffect(() => setX(value), [value, otherDep])`
        // mirror shape. Now we accept any deps array as long as the
        // prop root we mirror IS one of the deps - `otherDep` being
        // unused inside the body is a separate (exhaustive-deps) concern.
        const depIdentifierNames = new Set<string>();
        for (const element of depsNode.elements ?? []) {
          if (isNodeOfType(element, "Identifier")) depIdentifierNames.add(element.name);
        }
        if (depIdentifierNames.size === 0) continue;

        const callback = getEffectCallback(effectCall);
        if (!callback) continue;
        const bodyStatements = getCallbackStatements(callback);
        if (bodyStatements.length !== 1) continue;
        const onlyStatement = bodyStatements[0];
        const expression = isNodeOfType(onlyStatement, "ExpressionStatement")
          ? onlyStatement.expression
          : onlyStatement;
        if (!isNodeOfType(expression, "CallExpression")) continue;
        if (!isNodeOfType(expression.callee, "Identifier")) continue;
        if (!isSetterIdentifier(expression.callee.name)) continue;
        if (!expression.arguments?.length) continue;
        const setterArgument = expression.arguments[0];

        const matchedBinding = mirrorBindings.find(
          (binding) =>
            binding.setterName === expression.callee.name &&
            depIdentifierNames.has(binding.propRootName) &&
            areExpressionsStructurallyEqual(binding.initializer, setterArgument),
        );
        if (!matchedBinding) continue;

        context.report({
          node: effectCall,
          message: `useState "${matchedBinding.valueName}" is mirrored from prop "${matchedBinding.propRootName}" via this effect - delete both the useState and the effect, and read the prop directly in render`,
        });
      }
    };

    const propStackTracker = createComponentPropStackTracker({
      onComponentEnter: checkComponent,
    });

    return propStackTracker.visitors;
  },
});
