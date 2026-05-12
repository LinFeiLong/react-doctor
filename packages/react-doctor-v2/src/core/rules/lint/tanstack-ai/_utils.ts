import { isNodeOfType } from "../utils.js";
import type { EsTreeNode } from "../utils.js";

export const TANSTACK_AI_IMPORT_PATTERN = /^@tanstack\/ai(?:$|[-/])/;
export const VERCEL_AI_SDK_IMPORTS = new Map([
  ["ai", new Set(["generateText", "streamObject", "streamText"])],
  ["@ai-sdk/openai", new Set(["createOpenAI"])],
]);

export const CHAT_LIFECYCLE_CALLBACKS = new Set([
  "onAbort",
  "onAfterToolCall",
  "onBeforeToolCall",
  "onChunk",
  "onEnd",
  "onError",
  "onFinish",
  "onStart",
  "onUsage",
]);

export const getPropertyName = (property: EsTreeNode): string | null => {
  if (!isNodeOfType(property, "Property")) return null;
  if (isNodeOfType(property.key, "Identifier")) return property.key.name;
  if (isNodeOfType(property.key, "Literal")) return String(property.key.value);
  return null;
};

export const getObjectProperty = (
  objectExpression: EsTreeNode,
  propertyName: string,
): EsTreeNode | null => {
  if (!isNodeOfType(objectExpression, "ObjectExpression")) return null;
  for (const property of objectExpression.properties ?? []) {
    if (getPropertyName(property) === propertyName) return property;
  }
  return null;
};

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

export const getNamespaceImportName = (specifier: EsTreeNode): string | null => {
  if (!isNodeOfType(specifier, "ImportNamespaceSpecifier")) return null;
  return isNodeOfType(specifier.local, "Identifier") ? specifier.local.name : null;
};

export const isIdentifierCall = (node: EsTreeNode, names: Set<string>): boolean =>
  isNodeOfType(node, "CallExpression") &&
  isNodeOfType(node.callee, "Identifier") &&
  names.has(node.callee.name);

export const isNamespaceCall = (
  node: EsTreeNode,
  namespaceNames: Set<string>,
  importedName: string,
): boolean =>
  isNodeOfType(node, "CallExpression") &&
  isNodeOfType(node.callee, "MemberExpression") &&
  isNodeOfType(node.callee.object, "Identifier") &&
  namespaceNames.has(node.callee.object.name) &&
  isNodeOfType(node.callee.property, "Identifier") &&
  node.callee.property.name === importedName;

export { walkAst, isNodeOfType } from "../utils.js";
export type { EsTreeNode, Rule, RuleContext } from "../utils.js";
