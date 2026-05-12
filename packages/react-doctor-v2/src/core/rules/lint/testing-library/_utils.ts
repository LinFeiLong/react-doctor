import { isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

export const USER_EVENT_METHODS = new Set([
  "click",
  "dblClick",
  "hover",
  "keyboard",
  "selectOptions",
  "type",
  "unhover",
  "upload",
]);

export const getRootIdentifierName = (node: EsTreeNode | undefined): string | null => {
  if (!node) return null;
  if (isNodeOfType(node, "Identifier")) return node.name;
  if (isNodeOfType(node, "MemberExpression")) return getRootIdentifierName(node.object);
  return null;
};

export const getMemberPropertyName = (node: EsTreeNode | undefined): string | null => {
  if (!isNodeOfType(node, "MemberExpression")) return null;
  if (isNodeOfType(node.property, "Identifier")) return node.property.name;
  if (isNodeOfType(node.property, "Literal")) return String(node.property.value);
  return null;
};

export type { EsTreeNode, Rule, RuleContext };
export { isNodeOfType } from "../utils.js";
