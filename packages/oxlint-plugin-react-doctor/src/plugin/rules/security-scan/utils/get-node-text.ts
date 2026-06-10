import type { EsTreeNode } from "../../../utils/es-tree-node.js";
import type { ScannedFile } from "../../../utils/file-scan.js";
import { getNodeEndIndex } from "./get-node-end-index.js";
import { getNodeStartIndex } from "./get-node-start-index.js";

export const getNodeText = (file: ScannedFile, node: EsTreeNode | undefined): string => {
  if (node === undefined) return "";
  const startIndex = getNodeStartIndex(node);
  const endIndex = getNodeEndIndex(node);
  if (startIndex < 0 || endIndex < 0) return "";
  return file.content.slice(startIndex, endIndex);
};
