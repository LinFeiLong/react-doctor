import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const jsBatchDomCss = defineRule<Rule>({
  recommendation:
    "Batch DOM style changes with classes, cssText, or a single write phase to avoid repeated layout work.",
  examples: [
    {
      before: `el.style.width = width;
el.style.height = height;`,
      after: `el.className = "expanded";`,
    },
  ],
  create: (context: RuleContext) => {
    const isStyleAssignment = (node: EsTreeNode): boolean =>
      isNodeOfType(node, "ExpressionStatement") &&
      isNodeOfType(node.expression, "AssignmentExpression") &&
      isNodeOfType(node.expression.left, "MemberExpression") &&
      isNodeOfType(node.expression.left.object, "MemberExpression") &&
      isNodeOfType(node.expression.left.object.property, "Identifier") &&
      node.expression.left.object.property.name === "style";

    return {
      BlockStatement(node: EsTreeNode) {
        const statements = node.body ?? [];
        for (let statementIndex = 1; statementIndex < statements.length; statementIndex++) {
          if (
            isStyleAssignment(statements[statementIndex]) &&
            isStyleAssignment(statements[statementIndex - 1])
          ) {
            context.report({
              node: statements[statementIndex],
              message:
                "Multiple sequential element.style assignments - batch with cssText or classList for fewer reflows",
            });
          }
        }
      },
    };
  },
});
