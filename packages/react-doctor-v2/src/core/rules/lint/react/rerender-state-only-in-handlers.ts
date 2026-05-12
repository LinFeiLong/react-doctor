import { defineRule } from "../../registry.js";
import {
  buildLocalDependencyGraph,
  collectRenderReachableNames,
  collectReturnExpressions,
  collectUseStateBindings,
  expandTransitiveDependencies,
  isComponentAssignment,
  isUppercaseName,
  walkAst,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rerenderStateOnlyInHandlers = defineRule<Rule>({
  recommendation:
    "Avoid subscribing render to state that is only needed inside callbacks; read it on demand or store the transient value in a ref.",
  examples: [
    {
      before: `const params = useSearchParams();
const share = () => send(params.get("ref"));`,
      after: `const share = () => send(new URLSearchParams(location.search).get("ref"));`,
    },
  ],
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || !isNodeOfType(componentBody, "BlockStatement")) return;
      const bindings = collectUseStateBindings(componentBody);
      if (bindings.length === 0) return;

      const returnExpressions = collectReturnExpressions(componentBody);
      if (returnExpressions.length === 0) return;

      const dependencyGraph = buildLocalDependencyGraph(componentBody);
      const directRenderNames = collectRenderReachableNames(returnExpressions);
      const renderReachableNames = expandTransitiveDependencies(directRenderNames, dependencyGraph);

      for (const binding of bindings) {
        if (renderReachableNames.has(binding.valueName)) continue;

        let setterCalled = false;
        walkAst(componentBody, (child: EsTreeNode) => {
          if (setterCalled) return;
          if (
            isNodeOfType(child, "CallExpression") &&
            isNodeOfType(child.callee, "Identifier") &&
            child.callee.name === binding.setterName
          ) {
            setterCalled = true;
          }
        });
        if (!setterCalled) continue;

        context.report({
          node: binding.declarator,
          message: `useState "${binding.valueName}" is updated but never read in the component's return - use useRef so updates don't trigger re-renders`,
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
