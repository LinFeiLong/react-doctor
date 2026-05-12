import { defineRule } from "../../registry.js";
import { findJsxAttribute, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const FORM_FIELD_NAMES = new Set(["input", "textarea", "select"]);

const isInactiveAttributeValue = (attribute: EsTreeNode): boolean => {
  if (!attribute.value) return false;
  if (isNodeOfType(attribute.value, "Literal")) {
    return attribute.value.value === "false" || attribute.value.value === false;
  }
  const expression = attribute.value.expression;
  if (isNodeOfType(expression, "Literal")) {
    return expression.value === false || expression.value === null;
  }
  return isNodeOfType(expression, "Identifier") && expression.name === "undefined";
};

const isEmptyDescribedBy = (attribute: EsTreeNode | undefined): boolean => {
  if (!attribute) return true;
  if (!attribute.value) return true;
  if (isNodeOfType(attribute.value, "Literal")) {
    if (attribute.value.value === false || attribute.value.value === null) return true;
    return String(attribute.value.value ?? "").trim().length === 0;
  }
  const expression = attribute.value.expression;
  if (!expression) return true;
  if (isNodeOfType(expression, "Literal")) {
    if (expression.value === false || expression.value === null) return true;
    return String(expression.value ?? "").trim().length === 0;
  }
  return isNodeOfType(expression, "Identifier") && expression.name === "undefined";
};

export const noAriaInvalidWithoutDescribedby = defineRule<Rule>({
  recommendation:
    "When a field is invalid, wire the visible error text to the control with aria-describedby so screen reader users hear the specific fix, not just that the field is invalid.",
  examples: [
    {
      before: `<input aria-invalid={Boolean(error)} />`,
      after: `<input aria-invalid={Boolean(error)} aria-describedby={error ? "email-error" : undefined} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const elementName = isNodeOfType(node.name, "JSXIdentifier") ? node.name.name : null;
      if (!elementName || !FORM_FIELD_NAMES.has(elementName)) return;
      const ariaInvalid = findJsxAttribute(node.attributes ?? [], "aria-invalid");
      if (!ariaInvalid || isInactiveAttributeValue(ariaInvalid)) return;
      if (!isEmptyDescribedBy(findJsxAttribute(node.attributes ?? [], "aria-describedby"))) return;
      context.report({
        node,
        message:
          "invalid form field is not connected to its error text - add aria-describedby pointing at the visible error element id",
      });
    },
  }),
});
