import { defineRule } from "../../registry.js";
import { isComponentAssignment, isUppercaseName, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rerenderMemoWithDefaultValue = defineRule<Rule>({
  recommendation:
    "Hoist default object, array, and function prop values outside the component or use stable module-level constants.",
  examples: [
    {
      before: `function List({ items = [] }) {}`,
      after: `const EMPTY_ITEMS = [];
function List({ items = EMPTY_ITEMS }) {}`,
    },
  ],
  create: (context: RuleContext) => {
    const checkDefaultProps = (params: EsTreeNode[]): void => {
      for (const param of params) {
        if (!isNodeOfType(param, "ObjectPattern")) continue;
        for (const property of param.properties ?? []) {
          if (
            !isNodeOfType(property, "Property") ||
            !isNodeOfType(property.value, "AssignmentPattern")
          )
            continue;
          const defaultValue = property.value.right;
          if (
            isNodeOfType(defaultValue, "ObjectExpression") &&
            defaultValue.properties?.length === 0
          ) {
            context.report({
              node: defaultValue,
              message:
                "Default prop value {} creates a new object reference every render - extract to a module-level constant",
            });
          }
          if (
            isNodeOfType(defaultValue, "ArrayExpression") &&
            defaultValue.elements?.length === 0
          ) {
            context.report({
              node: defaultValue,
              message:
                "Default prop value [] creates a new array reference every render - extract to a module-level constant",
            });
          }
        }
      }
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        checkDefaultProps(node.params ?? []);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        checkDefaultProps(node.init.params ?? []);
      },
    };
  },
});
