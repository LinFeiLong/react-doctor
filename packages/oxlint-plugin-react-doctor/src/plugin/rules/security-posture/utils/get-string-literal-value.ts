import type { EsTreeNode } from "../../../utils/es-tree-node.js";
import { isNodeOfType } from "../../../utils/is-node-of-type.js";

export const getStringLiteralValue = (node: EsTreeNode | undefined): string | null => {
  if (!node) return null;
  if (!isNodeOfType(node, "Literal")) return null;
  if (typeof node.value === "string") return node.value;
  return null;
};
