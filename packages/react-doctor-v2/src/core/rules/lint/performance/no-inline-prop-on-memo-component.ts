import { defineRule } from "../../registry.js";
import { isInlineReference, isMemoCall, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noInlinePropOnMemoComponent = defineRule<Rule>({
  recommendation:
    "Hoist or memoize object, array, and function props passed to memoized children so memo can skip unchanged renders.",
  examples: [
    {
      before: `<MemoChart options={{ color }} />`,
      after: `const options = useMemo(() => ({ color }), [color]);
<MemoChart options={options} />`,
    },
  ],
  create: (context: RuleContext) => {
    const memoizedComponentNames = new Set<string>();

    return {
      VariableDeclarator(node: EsTreeNode) {
        if (!isNodeOfType(node.id, "Identifier") || !node.init) return;
        if (isMemoCall(node.init)) {
          memoizedComponentNames.add(node.id.name);
        }
      },
      ExportDefaultDeclaration(node: EsTreeNode) {
        if (node.declaration && isMemoCall(node.declaration)) {
          const innerArgument = node.declaration.arguments?.[0];
          if (isNodeOfType(innerArgument, "Identifier")) {
            memoizedComponentNames.add(innerArgument.name);
          }
        }
      },
      JSXAttribute(node: EsTreeNode) {
        if (!node.value || !isNodeOfType(node.value, "JSXExpressionContainer")) return;

        const openingElement = node.parent;
        if (!openingElement || !isNodeOfType(openingElement, "JSXOpeningElement")) return;

        let elementName: string | null = null;
        if (isNodeOfType(openingElement.name, "JSXIdentifier")) {
          elementName = openingElement.name.name;
        }
        if (!elementName || !memoizedComponentNames.has(elementName)) return;

        const propType = isInlineReference(node.value.expression);
        if (propType) {
          context.report({
            node: node.value.expression,
            message: `JSX attribute values should not contain ${propType} created in the same scope - ${elementName} is wrapped in memo(), so new references cause unnecessary re-renders`,
          });
        }
      },
    };
  },
});
