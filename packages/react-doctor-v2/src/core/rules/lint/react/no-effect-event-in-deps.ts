import { defineRule } from "../../registry.js";
import {
  HOOKS_WITH_DEPS,
  createComponentBindingStackTracker,
  isHookCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noEffectEventInDeps = defineRule<Rule>({
  recommendation:
    "Remove useEffectEvent callbacks from dependency arrays; they are intentionally stable event functions and should not re-subscribe effects.",
  examples: [
    {
      before: `useEffect(() => subscribe(onMessage), [onMessage]);`,
      after: `useEffect(() => subscribe(onMessage), []);`,
    },
  ],
  create: (context: RuleContext) => {
    const componentBindings = createComponentBindingStackTracker({
      onVariableDeclarator: (declaratorNode: EsTreeNode) => {
        if (!isNodeOfType(declaratorNode.id, "Identifier")) return;
        const initializer = declaratorNode.init;
        if (!initializer || !isNodeOfType(initializer, "CallExpression")) return;
        if (!isHookCall(initializer, "useEffectEvent")) return;
        componentBindings.addBindingToCurrentFrame(declaratorNode.id.name);
      },
    });

    return {
      ...componentBindings.visitors,
      CallExpression(node: EsTreeNode) {
        if (!isHookCall(node, HOOKS_WITH_DEPS) || node.arguments.length < 2) return;
        if (!componentBindings.isInsideComponent()) return;
        const depsNode = node.arguments[1];
        if (!isNodeOfType(depsNode, "ArrayExpression")) return;

        for (const element of depsNode.elements ?? []) {
          if (!isNodeOfType(element, "Identifier")) continue;
          if (componentBindings.isBoundName(element.name)) {
            context.report({
              node: element,
              message: `"${element.name}" is from useEffectEvent and must not be in the deps array - its identity is intentionally unstable; call it inside the effect without listing it`,
            });
          }
        }
      },
    };
  },
});
