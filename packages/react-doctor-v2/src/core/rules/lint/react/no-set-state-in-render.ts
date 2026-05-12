import { defineRule } from "../../registry.js";
import {
  collectUseStateBindings,
  isComponentAssignment,
  isUnconditionalSetterCallStatement,
  isUppercaseName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noSetStateInRender = defineRule<Rule>({
  recommendation:
    "Move state updates out of render into event handlers, effects, reducers, or lazy initializers so rendering stays pure.",
  examples: [
    {
      before: `if (!ready) setReady(true);`,
      after: `useEffect(() => setReady(true), []);`,
    },
  ],
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || !isNodeOfType(componentBody, "BlockStatement")) return;
      const setterNames = new Set(
        collectUseStateBindings(componentBody).map((binding) => binding.setterName),
      );
      if (setterNames.size === 0) return;

      for (const statement of componentBody.body ?? []) {
        const setterCall = isUnconditionalSetterCallStatement(statement, setterNames);
        if (!setterCall) continue;
        const setterIdentifierName = setterCall.callee.name;
        context.report({
          node: setterCall,
          message: `${setterIdentifierName}() called unconditionally at the top of render - causes an infinite re-render loop. Move into a useEffect or an event handler. (To derive state from props, guard the call: \`if (prev !== prop) ${setterIdentifierName}(prop)\`)`,
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
