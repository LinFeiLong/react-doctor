import { defineRule } from "../../registry.js";
import {
  VAGUE_BUTTON_LABELS,
  collectJsxLabelText,
  getOpeningElementTagName,
  isButtonLikeTagName,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noVagueButtonLabel = defineRule<Rule>({
  recommendation:
    "Use action-specific button labels that state what will happen, such as Save settings or Invite member.",
  examples: [
    {
      before: `<button>Continue</button>`,
      after: `<button>Save settings</button>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXElement(jsxElementNode: EsTreeNode) {
      const tagName = getOpeningElementTagName(jsxElementNode.openingElement);
      if (!tagName || !isButtonLikeTagName(tagName)) return;
      const labelText = collectJsxLabelText(jsxElementNode);
      if (!labelText) return;
      const normalizedLabel = labelText
        .toLowerCase()
        .replace(/[.!?…]+$/, "")
        .trim();
      if (!VAGUE_BUTTON_LABELS.has(normalizedLabel)) return;
      context.report({
        node: jsxElementNode.openingElement ?? jsxElementNode,
        message: `Vague button label "${labelText}" - name the action ("Save changes", "Send invite", "Delete account") so screen readers and hesitant users know what happens`,
      });
    },
  }),
});
