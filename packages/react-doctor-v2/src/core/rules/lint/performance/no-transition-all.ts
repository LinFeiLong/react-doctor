import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noTransitionAll = defineRule<Rule>({
  recommendation:
    "Replace transition: all with an explicit property list such as transform and opacity.",
  examples: [
    {
      before: `transition: all 200ms;`,
      after: `transition: transform 200ms, opacity 200ms;`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "style") return;
      if (!isNodeOfType(node.value, "JSXExpressionContainer")) return;

      const expression = node.value.expression;
      if (!isNodeOfType(expression, "ObjectExpression")) return;

      for (const property of expression.properties ?? []) {
        if (!isNodeOfType(property, "Property")) continue;
        const key = isNodeOfType(property.key, "Identifier") ? property.key.name : null;
        if (key !== "transition") continue;

        if (
          isNodeOfType(property.value, "Literal") &&
          typeof property.value.value === "string" &&
          property.value.value.startsWith("all")
        ) {
          context.report({
            node: property,
            message:
              'transition: "all" animates every property including layout - list only the properties you animate',
          });
        }
      }
    },
  }),
});
