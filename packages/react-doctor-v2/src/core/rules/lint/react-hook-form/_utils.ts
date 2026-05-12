import { isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

export const REACT_HOOK_FORM_IMPORT_SOURCE = "react-hook-form";
export const FORM_HOOK_NAMES = new Set(["useForm", "useFormContext"]);

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

export const getPropertyName = (property: EsTreeNode): string | null => {
  if (!isNodeOfType(property, "Property")) return null;
  if (isNodeOfType(property.key, "Identifier")) return property.key.name;
  if (isNodeOfType(property.key, "Literal")) return String(property.key.value);
  return null;
};

export type { EsTreeNode, Rule, RuleContext };
export { isNodeOfType } from "../utils.js";
