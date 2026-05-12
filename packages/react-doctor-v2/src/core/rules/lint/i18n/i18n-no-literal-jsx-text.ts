import { defineRule } from "../../registry.js";
import { hasLetters, isInsideIgnoredTextElement } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const i18nNoLiteralJsxText = defineRule<Rule>({
  recommendation:
    "Move user-facing JSX copy through next-intl, i18next, or the project translation layer; do not hide untranslated text by wrapping it in spans.",
  examples: [
    {
      before: `<button>Save changes</button>`,
      after: `<button>{t("actions.saveChanges")}</button>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXText(node: EsTreeNode) {
      const text = typeof node.value === "string" ? node.value.trim() : "";
      if (!text || !hasLetters(text)) return;
      if (isInsideIgnoredTextElement(node)) return;
      context.report({
        node,
        message: `literal JSX text "${text}" is user-facing copy - read it from the translation layer`,
      });
    },
  }),
});
