import { isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

export const STORY_FILE_PATTERN = /\.(?:stories|story)\.[jt]sx?$/;

export const getMemberPropertyName = (node: EsTreeNode | undefined): string | null => {
  if (!isNodeOfType(node, "MemberExpression")) return null;
  if (isNodeOfType(node.property, "Identifier")) return node.property.name;
  if (isNodeOfType(node.property, "Literal")) return String(node.property.value);
  return null;
};

export const isUserEventCall = (node: EsTreeNode): boolean =>
  isNodeOfType(node, "CallExpression") &&
  isNodeOfType(node.callee, "MemberExpression") &&
  isNodeOfType(node.callee.object, "Identifier") &&
  node.callee.object.name === "userEvent" &&
  Boolean(getMemberPropertyName(node.callee));

export type { EsTreeNode, Rule, RuleContext };
export { isNodeOfType } from "../utils.js";
