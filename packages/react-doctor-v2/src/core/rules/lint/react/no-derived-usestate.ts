import { defineRule } from "../../registry.js";
import {
  createComponentPropStackTracker,
  getRootIdentifierName,
  isHookCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noDerivedUseState = defineRule<Rule>({
  recommendation:
    "Initialize state only for truly mutable local state; derive props and computed values directly during render or with useMemo.",
  examples: [
    {
      before: `const [fullName] = useState(\`\${first} \${last}\`);`,
      after: `const fullName = \`\${first} \${last}\`;`,
    },
  ],
  create: (context: RuleContext) => {
    const propStackTracker = createComponentPropStackTracker();

    return {
      ...propStackTracker.visitors,
      CallExpression(node: EsTreeNode) {
        if (!isHookCall(node, "useState") || !node.arguments?.length) return;
        const initializer = node.arguments[0];

        if (
          isNodeOfType(initializer, "Identifier") &&
          propStackTracker.isPropName(initializer.name)
        ) {
          context.report({
            node,
            message: `useState initialized from prop "${initializer.name}" - if this value should stay in sync with the prop, derive it during render instead`,
          });
          return;
        }

        if (isNodeOfType(initializer, "MemberExpression") && !initializer.computed) {
          const rootIdentifierName = getRootIdentifierName(initializer);
          if (rootIdentifierName && propStackTracker.isPropName(rootIdentifierName)) {
            context.report({
              node,
              message: `useState initialized from prop "${rootIdentifierName}" - if this value should stay in sync with the prop, derive it during render instead`,
            });
          }
        }
      },
    };
  },
});
