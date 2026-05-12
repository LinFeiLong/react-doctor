import { defineRule } from "../../registry.js";
import { GENERIC_EVENT_SUFFIXES, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noGenericHandlerNames = defineRule<Rule>({
  recommendation:
    "Name handlers after the user action or domain event, such as handleSave or handleInvite, instead of generic click/change names.",
  examples: [
    {
      before: `const handleClick = () => saveSettings();`,
      after: `const handleSaveSettings = () => saveSettings();`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || !node.name.name.startsWith("on")) return;
      if (!node.value || !isNodeOfType(node.value, "JSXExpressionContainer")) return;

      const eventSuffix = node.name.name.slice(2);
      if (!GENERIC_EVENT_SUFFIXES.has(eventSuffix)) return;

      const mirroredHandlerName = `handle${eventSuffix}`;
      const expression = node.value.expression;
      if (isNodeOfType(expression, "Identifier") && expression.name === mirroredHandlerName) {
        context.report({
          node,
          message: `Non-descriptive handler name "${expression.name}" - name should describe what it does, not when it runs`,
        });
      }
    },
  }),
});
