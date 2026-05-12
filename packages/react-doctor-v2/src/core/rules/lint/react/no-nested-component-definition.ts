import { defineRule } from "../../registry.js";
import { isComponentAssignment, isComponentDeclaration } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noNestedComponentDefinition = defineRule<Rule>({
  recommendation:
    "Move component definitions to module scope so React sees a stable component type and preserves state across parent renders.",
  examples: [
    {
      before: `function Parent() { function Child() { return <div />; } return <Child />; }`,
      after: `function Child() { return <div />; }
function Parent() { return <Child />; }`,
    },
  ],
  create: (context: RuleContext) => {
    const componentStack: string[] = [];

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!isComponentDeclaration(node)) return;
        if (componentStack.length > 0) {
          context.report({
            node: node.id,
            message: `Component "${node.id.name}" defined inside "${componentStack[componentStack.length - 1]}" - creates new instance every render, destroying state`,
          });
        }
        componentStack.push(node.id.name);
      },
      "FunctionDeclaration:exit"(node: EsTreeNode) {
        if (isComponentDeclaration(node)) componentStack.pop();
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        if (componentStack.length > 0) {
          context.report({
            node: node.id,
            message: `Component "${node.id.name}" defined inside "${componentStack[componentStack.length - 1]}" - creates new instance every render, destroying state`,
          });
        }
        componentStack.push(node.id.name);
      },
      "VariableDeclarator:exit"(node: EsTreeNode) {
        if (isComponentAssignment(node)) componentStack.pop();
      },
    };
  },
});
