import { isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

export const TRANSLATION_COMPONENT_NAMES = new Set([
  "FormattedMessage",
  "I18n",
  "Trans",
  "Translate",
]);

export const NON_USER_TEXT_ELEMENTS = new Set([
  "code",
  "kbd",
  "pre",
  "script",
  "style",
  "textarea",
]);

export const TRANSLATION_HOOK_NAMES = new Set(["useTranslations", "useTranslation"]);
export const TRANSLATION_FUNCTION_NAMES = new Set(["t", "i18n.t"]);

export const getJsxName = (node: EsTreeNode | undefined): string | null => {
  if (!node) return null;
  if (isNodeOfType(node, "JSXIdentifier")) return node.name;
  if (isNodeOfType(node, "JSXMemberExpression")) {
    const objectName = getJsxName(node.object);
    const propertyName = getJsxName(node.property);
    return objectName && propertyName ? `${objectName}.${propertyName}` : propertyName;
  }
  return null;
};

export const isInsideIgnoredTextElement = (node: EsTreeNode): boolean => {
  let currentNode = node.parent;
  while (currentNode) {
    if (isNodeOfType(currentNode, "JSXElement")) {
      const elementName = getJsxName(currentNode.openingElement?.name);
      if (elementName && TRANSLATION_COMPONENT_NAMES.has(elementName)) return true;
      if (elementName && NON_USER_TEXT_ELEMENTS.has(elementName)) return true;
    }
    currentNode = currentNode.parent;
  }
  return false;
};

export const hasLetters = (value: string): boolean => /[A-Za-z]/.test(value);

export const getImportSourceValue = (node: EsTreeNode): string | null => {
  if (!isNodeOfType(node, "ImportDeclaration")) return null;
  const value = node.source?.value;
  return typeof value === "string" ? value : null;
};

export const getImportedName = (specifier: EsTreeNode): string | null => {
  if (!isNodeOfType(specifier, "ImportSpecifier")) return null;
  if (isNodeOfType(specifier.imported, "Identifier")) return specifier.imported.name;
  if (isNodeOfType(specifier.imported, "Literal")) return String(specifier.imported.value);
  return null;
};

export const getLocalName = (specifier: EsTreeNode): string | null => {
  if (isNodeOfType(specifier.local, "Identifier")) return specifier.local.name;
  return getImportedName(specifier);
};

export type { EsTreeNode, Rule, RuleContext };
export { isNodeOfType } from "../utils.js";
