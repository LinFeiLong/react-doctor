import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rhfNoNestedObjectSetvalue = defineRule<Rule>({
  recommendation:
    "Call setValue with the exact field path you changed; passing nested objects bypasses React Hook Form's focused dirty/touched tracking.",
  examples: [
    {
      before: `setValue("user", { firstName: "Ada" });`,
      after: `setValue("user.firstName", "Ada");`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "Identifier") || node.callee.name !== "setValue") return;
      const fieldName = node.arguments?.[0];
      const valueArgument = node.arguments?.[1];
      if (!isNodeOfType(fieldName, "Literal") || typeof fieldName.value !== "string") return;
      if (fieldName.value.includes(".")) return;
      if (!isNodeOfType(valueArgument, "ObjectExpression")) return;
      context.report({
        node,
        message: `setValue("${fieldName.value}", object) updates a nested object at once - target the exact field path instead`,
      });
    },
  }),
});
