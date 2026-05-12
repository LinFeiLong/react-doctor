import { walkAst, isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

export const SWR_HOOK_NAMES = new Set(["useSWR", "useSWRImmutable", "useSWRInfinite"]);
export const SWR_IMPORT_SOURCES = new Set(["swr", "swr/immutable", "swr/infinite"]);

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

export const containsUnstableSWRKeyValue = (node: EsTreeNode | undefined): string | null => {
  if (!node) return null;
  let unstableSource: string | null = null;
  walkAst(node, (child) => {
    if (unstableSource) return false;
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
      if (unstableSource) return false;
    }
  });
  return unstableSource;
};

export type { EsTreeNode, Rule, RuleContext };
export { isNodeOfType } from "../utils.js";
