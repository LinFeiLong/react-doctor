import { defineRule } from "../../registry.js";
import { isUppercaseName, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noDefaultProps = defineRule<Rule>({
  recommendation:
    "Use ES default parameters or default values in destructuring instead of defaultProps on function components.",
  examples: [
    {
      before: `Button.defaultProps = { size: "md" };`,
      after: `function Button({ size = "md" }) {}`,
    },
  ],
  create: (context: RuleContext) => ({
    AssignmentExpression(node: EsTreeNode) {
      if (node.operator !== "=") return;
      const left = node.left;
      if (!isNodeOfType(left, "MemberExpression")) return;
      if (left.computed) return;
      if (!isNodeOfType(left.property, "Identifier") || left.property.name !== "defaultProps")
        return;
      if (!isNodeOfType(left.object, "Identifier")) return;
      if (!isUppercaseName(left.object.name)) return;
      context.report({
        node: left,
        message: `${left.object.name}.defaultProps - React 19 removes \`defaultProps\` for function components and discourages it for class components. Move defaults into the destructured props parameter (e.g. \`function ${left.object.name}({ size = "md", ...rest })\`) so the rule applies cleanly to both shapes`,
      });
    },
  }),
});
