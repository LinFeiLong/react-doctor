import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noPolymorphicChildren = defineRule<Rule>({
  recommendation:
    "Keep children as renderable content and pass component types or render functions through explicit props when polymorphism is required.",
  examples: [
    {
      before: `<Slot>{Component}</Slot>`,
      after: `<Slot component={Component} />`,
    },
  ],
  create: (context: RuleContext) => ({
    BinaryExpression(node: EsTreeNode) {
      if (node.operator !== "===" && node.operator !== "==") return;

      const isTypeofChildren = (operand: EsTreeNode | undefined): boolean =>
        isNodeOfType(operand, "UnaryExpression") &&
        operand.operator === "typeof" &&
        isNodeOfType(operand.argument, "Identifier") &&
        operand.argument.name === "children";

      if (!isTypeofChildren(node.left) && !isTypeofChildren(node.right)) return;

      const isStringLiteral = (operand: EsTreeNode | undefined): boolean =>
        isNodeOfType(operand, "Literal") && operand.value === "string";

      if (!isStringLiteral(node.left) && !isStringLiteral(node.right)) return;

      context.report({
        node,
        message:
          'Polymorphic `typeof children === "string"` check - expose explicit subcomponents (e.g. `<Button.Text>`) instead of branching on what the consumer passed',
      });
    },
  }),
});
