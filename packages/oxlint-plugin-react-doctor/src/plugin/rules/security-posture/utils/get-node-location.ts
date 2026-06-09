import type { EsTreeNode } from "../../../utils/es-tree-node.js";
import type { SourceLocation } from "./get-location-at-index.js";
import { getLocationAtIndex } from "./get-location-at-index.js";
import { getNodeStartIndex } from "./get-node-start-index.js";

export const getNodeLocation = (content: string, node: EsTreeNode): SourceLocation =>
  getLocationAtIndex(content, getNodeStartIndex(node));
