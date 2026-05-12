import { defineRule } from "../../registry.js";
import { containsPreventDefaultCall, findJsxAttribute, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const PASTEABLE_FIELD_NAMES = new Set(["input", "textarea"]);

export const noBlockedPaste = defineRule<Rule>({
  recommendation:
    "Do not block paste in text fields; paste is how password managers, OTP autofill, and assistive tooling enter data, so validate and explain errors instead.",
  examples: [
    {
      before: `<input onPaste={(event) => event.preventDefault()} />`,
      after: `<input autoComplete="one-time-code" inputMode="numeric" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const elementName = isNodeOfType(node.name, "JSXIdentifier") ? node.name.name : null;
      if (!elementName || !PASTEABLE_FIELD_NAMES.has(elementName)) return;
      const onPaste = findJsxAttribute(node.attributes ?? [], "onPaste");
      if (!isNodeOfType(onPaste?.value, "JSXExpressionContainer")) return;
      if (!containsPreventDefaultCall(onPaste.value.expression)) return;
      context.report({
        node,
        message:
          "input paste is blocked - validate the pasted value and show an error instead of breaking password managers, OTP autofill, and assistive tools",
      });
    },
  }),
});
