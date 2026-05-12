import { findJsxAttribute, isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

export const RADIX_PRIMITIVE_IMPORT_PATTERN = /^@radix-ui\/react-/;

export const getImportSourceValue = (node: EsTreeNode): string | null => {
  if (!isNodeOfType(node, "ImportDeclaration")) return null;
  const value = node.source?.value;
  return typeof value === "string" ? value : null;
};

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

export const hasTruthyAsChild = (openingElement: EsTreeNode): boolean => {
  const asChild = findJsxAttribute(openingElement.attributes ?? [], "asChild");
  if (!asChild) return false;
  if (!asChild.value) return true;
  if (isNodeOfType(asChild.value, "Literal")) return asChild.value.value !== false;
  const expression = asChild.value.expression;
  if (isNodeOfType(expression, "Literal")) return expression.value !== false;
  return Boolean(expression);
};

export const getMeaningfulJsxChildren = (node: EsTreeNode): EsTreeNode[] =>
  (node.children ?? []).filter((child: EsTreeNode) => {
    if (!isNodeOfType(child, "JSXText")) return true;
    return child.value.trim().length > 0;
  });

export type { EsTreeNode, Rule, RuleContext };
export { isNodeOfType } from "../utils.js";
