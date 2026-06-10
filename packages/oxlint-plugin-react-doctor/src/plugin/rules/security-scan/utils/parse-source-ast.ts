import type { EsTreeNode } from "../../../utils/es-tree-node.js";
import { parseSourceText } from "../../../utils/parse-source-file.js";
import type { ScannedFile } from "../../../utils/file-scan.js";
import { isProductionSourcePath } from "./is-production-source-path.js";

export const parseSourceAst = (file: ScannedFile): EsTreeNode | null => {
  if (!isProductionSourcePath(file.relativePath)) return null;
  return parseSourceText(file.absolutePath, file.content);
};
