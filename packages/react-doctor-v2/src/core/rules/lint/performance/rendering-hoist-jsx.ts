import { defineRule } from "../../registry.js";
import {
  isComponentAssignment,
  isUppercaseName,
  jsxReferencesLocalScope,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const renderingHoistJsx = defineRule<Rule>({
  recommendation:
    "Hoist static JSX out of components or memoize it only when it does not capture render-local values.",
  examples: [
    {
      before: `function App() { return <Icon />; }`,
      after: `const icon = <Icon />;
function App() { return icon; }`,
    },
  ],
  create: (context: RuleContext) => {
    let componentDepth = 0;

    const isComponentLike = (node: EsTreeNode): boolean => {
      if (
        isNodeOfType(node, "FunctionDeclaration") &&
        node.id?.name &&
        isUppercaseName(node.id.name)
      ) {
        return true;
      }
      if (isNodeOfType(node, "VariableDeclarator") && isComponentAssignment(node)) {
        return true;
      }
      return false;
    };

    const enter = (node: EsTreeNode): void => {
      if (isComponentLike(node)) componentDepth++;
    };
    const exit = (node: EsTreeNode): void => {
      if (isComponentLike(node)) componentDepth = Math.max(0, componentDepth - 1);
    };

    return {
      FunctionDeclaration: enter,
      "FunctionDeclaration:exit": exit,
      VariableDeclarator: enter,
      "VariableDeclarator:exit": exit,
      VariableDeclaration(node: EsTreeNode) {
        if (componentDepth === 0) return;
        if (node.kind !== "const") return;
        for (const declarator of node.declarations ?? []) {
          const init = declarator.init;
          if (!init) continue;
          if (!isNodeOfType(init, "JSXElement") && !isNodeOfType(init, "JSXFragment")) continue;
          if (jsxReferencesLocalScope(init)) continue;
          const name = isNodeOfType(declarator.id, "Identifier") ? declarator.id.name : "<unnamed>";
          context.report({
            node: declarator,
            message: `Static JSX "${name}" inside a component - hoist to module scope so it isn't recreated each render`,
          });
        }
      },
    };
  },
});
