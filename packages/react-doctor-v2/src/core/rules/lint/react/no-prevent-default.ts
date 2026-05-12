import { defineRule } from "../../registry.js";
import {
  PREVENT_DEFAULT_ELEMENTS,
  buildPreventDefaultMessage,
  containsPreventDefaultCall,
  findJsxAttribute,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noPreventDefault = defineRule<Rule>({
  recommendation:
    "Avoid preventDefault unless the component is intentionally replacing native browser behavior; prefer semantic controls.",
  examples: [
    {
      before: `<button onClick={(event) => { event.preventDefault(); save(); }} />`,
      after: `<button type="button" onClick={save} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const elementName = isNodeOfType(node.name, "JSXIdentifier") ? node.name.name : null;
      if (!elementName) return;

      const targetEventProps = PREVENT_DEFAULT_ELEMENTS.get(elementName);
      if (!targetEventProps) return;

      for (const targetEventProp of targetEventProps) {
        const eventAttribute = findJsxAttribute(node.attributes ?? [], targetEventProp);
        if (!eventAttribute?.value || !isNodeOfType(eventAttribute.value, "JSXExpressionContainer"))
          continue;

        const expression = eventAttribute.value.expression;
        if (
          !isNodeOfType(expression, "ArrowFunctionExpression") &&
          !isNodeOfType(expression, "FunctionExpression")
        )
          continue;

        if (!containsPreventDefaultCall(expression)) continue;

        context.report({ node, message: buildPreventDefaultMessage(elementName) });
        return;
      }
    },
  }),
});
