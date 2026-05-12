import { defineRule } from "../../registry.js";
import {
  findThresholdDerivedBindings,
  isComponentAssignment,
  isUppercaseName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rerenderDerivedStateFromHook = defineRule<Rule>({
  recommendation:
    "Subscribe to the derived boolean or threshold value instead of a continuously changing raw measurement when only the threshold matters.",
  examples: [
    {
      before: `const width = useWindowWidth();
const isMobile = width < 768;`,
      after: `const isMobile = useMediaQuery("(max-width: 767px)");`,
    },
  ],
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || !isNodeOfType(componentBody, "BlockStatement")) return;
      const bindings = findThresholdDerivedBindings(componentBody);
      for (const binding of bindings) {
        context.report({
          node: binding.declarator,
          message: `${binding.hookName}() returns a continuously-changing value but you only compare it to a threshold - use a media-query / threshold hook (e.g. \`useMediaQuery("(max-width: 767px)")\`) so the component re-renders only when the threshold flips`,
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
