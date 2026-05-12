import { isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

export const MOBX_REACT_IMPORT_SOURCES = new Set(["mobx-react", "mobx-react-lite"]);

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
