export {
  EFFECT_HOOK_NAMES,
  MUTATING_HTTP_METHODS,
  QUERY_CACHE_UPDATE_METHODS,
  STABLE_HOOK_WRAPPERS,
  TANSTACK_MUTATION_HOOKS,
  TANSTACK_QUERY_CLIENT_CLASS,
  TANSTACK_QUERY_HOOKS,
  UPPERCASE_PATTERN,
} from "../constants.js";
import { isNodeOfType, walkAst } from "../utils.js";
import type { EsTreeNode } from "../utils.js";

export const TANSTACK_QUERY_IMPORT_SOURCES = new Set([
  "@tanstack/react-query",
  "@tanstack/query-core",
  "react-query",
]);

export const QUERY_KEY_PROPERTY_NAMES = new Set(["queryKey", "mutationKey"]);

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

export const isIdentifierCall = (node: EsTreeNode, names: Set<string>): boolean =>
  isNodeOfType(node, "CallExpression") &&
  isNodeOfType(node.callee, "Identifier") &&
  names.has(node.callee.name);

export const containsUnstableQueryKeyValue = (node: EsTreeNode | undefined): string | null => {
  if (!node) return null;
  let unstableSource: string | null = null;
  walkAst(node, (child) => {
    if (unstableSource) return false;
    if (
      isNodeOfType(child, "FunctionExpression") ||
      isNodeOfType(child, "ArrowFunctionExpression")
    ) {
      unstableSource = "function value";
      return false;
    }
    if (
      isNodeOfType(child, "NewExpression") &&
      isNodeOfType(child.callee, "Identifier") &&
      child.callee.name === "Date"
    ) {
      unstableSource = "new Date()";
      return false;
    }
    if (
      isNodeOfType(child, "CallExpression") &&
      isNodeOfType(child.callee, "MemberExpression") &&
      isNodeOfType(child.callee.object, "Identifier") &&
      isNodeOfType(child.callee.property, "Identifier")
    ) {
      const receiverName = child.callee.object.name;
      const methodName = child.callee.property.name;
      if (receiverName === "Date" && methodName === "now") unstableSource = "Date.now()";
      if (receiverName === "Math" && methodName === "random") unstableSource = "Math.random()";
      if (receiverName === "crypto" && methodName === "randomUUID")
        unstableSource = "crypto.randomUUID()";
      if (unstableSource) return false;
    }
  });
  return unstableSource;
};

export { getEffectCallback, isHookCall, isNodeOfType, walkAst } from "../utils.js";
export type { EsTreeNode, RuleContext, Rule } from "../utils.js";
