import type { EsTreeNodeOfType } from "../../../utils/es-tree-node-of-type.js";
import { isAstNode } from "../../../utils/is-ast-node.js";
import type { ScannedFile } from "../../../utils/file-scan.js";
import { getNodeText } from "./get-node-text.js";

export const getCalleeText = (
  file: ScannedFile,
  node: EsTreeNodeOfType<"CallExpression">,
): string => {
  return isAstNode(node.callee) ? getNodeText(file, node.callee) : "";
};
