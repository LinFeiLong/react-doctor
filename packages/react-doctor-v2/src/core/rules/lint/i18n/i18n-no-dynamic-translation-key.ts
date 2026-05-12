import { defineRule } from "../../registry.js";
import {
  TRANSLATION_FUNCTION_NAMES,
  TRANSLATION_HOOK_NAMES,
  getImportSourceValue,
  getImportedName,
  getLocalName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const I18N_IMPORT_SOURCES = new Set(["i18next", "next-intl", "react-i18next"]);

const isStaticKey = (node: EsTreeNode | undefined): boolean =>
  isNodeOfType(node, "Literal") && typeof node.value === "string";

export const i18nNoDynamicTranslationKey = defineRule<Rule>({
  recommendation:
    "Use literal translation keys so extraction, type generation, and missing-key checks can see every message; map dynamic state to explicit keys before calling t().",
  examples: [
    {
      before: "t(`errors.${code}`)",
      after: `code === "required" ? t("errors.required") : t("errors.unknown")`,
    },
  ],
  create: (context: RuleContext) => {
    const translationFunctionNames = new Set(TRANSLATION_FUNCTION_NAMES);
    const translationHookNames = new Set(TRANSLATION_HOOK_NAMES);

    return {
      ImportDeclaration(node: EsTreeNode) {
        if (!I18N_IMPORT_SOURCES.has(getImportSourceValue(node) ?? "")) return;
        for (const specifier of node.specifiers ?? []) {
          const importedName = getImportedName(specifier);
          const localName = getLocalName(specifier);
          if (!localName) continue;
          if (importedName && TRANSLATION_HOOK_NAMES.has(importedName))
            translationHookNames.add(localName);
          if (importedName === "t") translationFunctionNames.add(localName);
        }
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isNodeOfType(node.id, "Identifier")) return;
        if (!isNodeOfType(node.init, "CallExpression")) return;
        const calleeName = isNodeOfType(node.init.callee, "Identifier")
          ? node.init.callee.name
          : null;
        if (!calleeName || !translationHookNames.has(calleeName)) return;
        translationFunctionNames.add(node.id.name);
      },
      CallExpression(node: EsTreeNode) {
        if (
          !isNodeOfType(node.callee, "Identifier") ||
          !translationFunctionNames.has(node.callee.name)
        )
          return;
        if (isStaticKey(node.arguments?.[0])) return;
        context.report({
          node: node.arguments?.[0] ?? node,
          message:
            "translation key is dynamic - use a literal key or an explicit map of possible keys",
        });
      },
    };
  },
});
