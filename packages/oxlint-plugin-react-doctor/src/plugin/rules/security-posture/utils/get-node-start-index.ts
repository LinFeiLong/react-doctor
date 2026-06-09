import type { EsTreeNode } from "../../../utils/es-tree-node.js";

export const getNodeStartIndex = (node: EsTreeNode): number => {
  if (node.range !== undefined) return node.range[0];
  if ("start" in node && typeof node.start === "number") return node.start;
  return -1;
};
