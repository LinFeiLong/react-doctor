import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noScaleFromZero = defineRule<Rule>({
  recommendation:
    "Scale from a small non-zero value or use opacity/clip reveal so layout and rasterization avoid singular transform artifacts.",
  examples: [
    {
      before: `transform: scale(0);`,
      after: `transform: scale(0.95); opacity: 0;`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier")) return;
      if (node.name.name !== "initial" && node.name.name !== "exit") return;
      if (!isNodeOfType(node.value, "JSXExpressionContainer")) return;

      const expression = node.value.expression;
      if (!isNodeOfType(expression, "ObjectExpression")) return;

      for (const property of expression.properties ?? []) {
        if (!isNodeOfType(property, "Property")) continue;
        const key = isNodeOfType(property.key, "Identifier") ? property.key.name : null;
        if (key !== "scale") continue;

        if (isNodeOfType(property.value, "Literal") && property.value.value === 0) {
          context.report({
            node: property,
            message:
              "scale: 0 makes elements appear from nowhere - use scale: 0.95 with opacity: 0 for natural entrance",
          });
        }
      }
    },
  }),
});
