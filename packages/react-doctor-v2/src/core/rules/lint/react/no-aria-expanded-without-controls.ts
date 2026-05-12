import { defineRule } from "../../registry.js";
import { findJsxAttribute, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

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

const hasNonEmptyControls = (node: EsTreeNode): boolean => {
  const ariaControls = findJsxAttribute(node.attributes ?? [], "aria-controls");
  if (!ariaControls?.value) return false;
  if (isNodeOfType(ariaControls.value, "Literal")) {
    if (ariaControls.value.value === false || ariaControls.value.value === null) return false;
    return String(ariaControls.value.value ?? "").trim().length > 0;
  }
  const expression = ariaControls.value.expression;
  if (isNodeOfType(expression, "Literal")) {
    if (expression.value === false || expression.value === null) return false;
    return String(expression.value ?? "").trim().length > 0;
  }
  if (isNodeOfType(expression, "Identifier") && expression.name === "undefined") return false;
  return Boolean(expression);
};

export const noAriaExpandedWithoutControls = defineRule<Rule>({
  recommendation:
    "Pair aria-expanded with aria-controls so assistive tech can identify which panel, menu, or disclosure region the control opens.",
  examples: [
    {
      before: `<button aria-expanded={isOpen}>Filters</button>`,
      after: `<button aria-expanded={isOpen} aria-controls="filters-panel">Filters</button>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const ariaExpanded = findJsxAttribute(node.attributes ?? [], "aria-expanded");
      if (!ariaExpanded || isInactiveAttributeValue(ariaExpanded)) return;
      if (hasNonEmptyControls(node)) return;
      context.report({
        node,
        message:
          "aria-expanded control is missing aria-controls - point it at the id of the panel or menu it toggles",
      });
    },
  }),
});
