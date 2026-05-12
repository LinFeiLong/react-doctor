import { defineRule } from "../../registry.js";
import { isNumericName, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const renderingConditionalRender = defineRule<Rule>({
  recommendation:
    "Use ternaries or explicit null branches for JSX conditionals so falsy values like 0 do not accidentally render.",
  examples: [
    {
      before: `{items.length && <List items={items} />}`,
      after: `{items.length > 0 ? <List items={items} /> : null}`,
    },
  ],
  create: (context: RuleContext) => ({
    LogicalExpression(node: EsTreeNode) {
      if (node.operator !== "&&") return;

      const isRightJsx =
        isNodeOfType(node.right, "JSXElement") || isNodeOfType(node.right, "JSXFragment");
      if (!isRightJsx) return;

      const left = node.left;
      if (!left) return;

      const isLengthMemberAccess =
        isNodeOfType(left, "MemberExpression") &&
        isNodeOfType(left.property, "Identifier") &&
        left.property.name === "length";

      const isNumericIdentifier = isNodeOfType(left, "Identifier") && isNumericName(left.name);

      if (isLengthMemberAccess || isNumericIdentifier) {
        context.report({
          node,
          message:
            "Conditional rendering with a numeric value can render '0' - use `value > 0`, `Boolean(value)`, or a ternary",
        });
      }
    },
  }),
});
