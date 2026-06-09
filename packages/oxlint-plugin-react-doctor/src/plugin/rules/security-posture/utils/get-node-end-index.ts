import type { EsTreeNode } from "../../../utils/es-tree-node.js";

export const getNodeEndIndex = (node: EsTreeNode): number => {
  if (node.range !== undefined) return node.range[1];
  if ("end" in node && typeof node.end === "number") return node.end;
  return -1;
};
