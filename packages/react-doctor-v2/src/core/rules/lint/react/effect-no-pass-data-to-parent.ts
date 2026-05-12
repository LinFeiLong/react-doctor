import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  collectUseRefBindingNames,
  collectUseStateBindings,
  collectValueIdentifierNames,
  createComponentPropStackTracker,
  getCallbackStatements,
  getEffectCallback,
  isHookCall,
  walkInsideStatementBlocks,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const isCallbackPropName = (name: string): boolean => /^on[A-Z]/.test(name);

const effectHasCleanup = (callback: EsTreeNode): boolean =>
  getCallbackStatements(callback).some((statement) => isNodeOfType(statement, "ReturnStatement"));

const collectConstantBindings = (componentBody: EsTreeNode): Set<string> => {
  const constantNames = new Set<string>();
  for (const statement of componentBody.body ?? []) {
    if (!isNodeOfType(statement, "VariableDeclaration")) continue;
    for (const declarator of statement.declarations ?? []) {
      if (!isNodeOfType(declarator.id, "Identifier")) continue;
      const init = declarator.init;
      if (
        isNodeOfType(init, "Literal") ||
        isNodeOfType(init, "TemplateLiteral") ||
        isNodeOfType(init, "ArrayExpression") ||
        isNodeOfType(init, "ObjectExpression")
      ) {
        constantNames.add(declarator.id.name);
      }
    }
  }
  return constantNames;
};

export const effectNoPassDataToParent = defineRule<Rule>({
  recommendation:
    "Do not fetch or derive child-owned data and push it to a parent from an effect; fetch in the parent and pass data down, or return data from the hook.",
  examples: [
    {
      before: `useEffect(() => {
  onData(result);
}, [result]);`,
      after: `const result = useData();
return <ParentOwnedView result={result} />;`,
    },
  ],
  create: (context: RuleContext) => {
    const propTracker = createComponentPropStackTracker();

    return {
      ...propTracker.visitors,
      CallExpression(node: EsTreeNode) {
        if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
        const propNames = propTracker.getCurrentPropNames();
        const callbackPropNames = new Set([...propNames].filter(isCallbackPropName));
        if (callbackPropNames.size === 0) return;
        const callback = getEffectCallback(node);
        if (!callback || effectHasCleanup(callback)) return;
        const componentBody = node.parent?.parent;
        if (!isNodeOfType(componentBody, "BlockStatement")) return;

        const knownNonDataNames = new Set<string>(propNames);
        for (const binding of collectUseStateBindings(componentBody))
          knownNonDataNames.add(binding.valueName);
        for (const refName of collectUseRefBindingNames(componentBody))
          knownNonDataNames.add(refName);
        for (const constantName of collectConstantBindings(componentBody))
          knownNonDataNames.add(constantName);

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
          const dataName = argumentNames.find((name) => !knownNonDataNames.has(name));
          if (!dataName) return;
          context.report({
            node: child,
            message: `effect passes child-owned data "${dataName}" to parent callback "${child.callee.name}" - move the data ownership to the parent instead`,
          });
        });
      },
    };
  },
});
