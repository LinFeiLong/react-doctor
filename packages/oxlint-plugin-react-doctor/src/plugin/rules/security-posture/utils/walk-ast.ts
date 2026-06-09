import { visitorKeys } from "oxc-parser";
import type { EsTreeNode } from "../../../utils/es-tree-node.js";
import { isAstNode } from "../../../utils/is-ast-node.js";

// Iterative walk in oxc `visitorKeys` order with no pruning — distinct from
// the recursive, prunable `../../../utils/walk-ast.js` walker. Consolidating
// the two is a tracked follow-up.
export const walkAst = (root: EsTreeNode, visit: (node: EsTreeNode) => void): void => {
  const stack: EsTreeNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) continue;
    visit(node);
    const keys = visitorKeys[node.type] ?? [];
    const nodeRecord = node as unknown as Record<string, unknown>;
    for (let keyIndex = keys.length - 1; keyIndex >= 0; keyIndex -= 1) {
      const child = nodeRecord[keys[keyIndex]];
      if (Array.isArray(child)) {
        for (let childIndex = child.length - 1; childIndex >= 0; childIndex -= 1) {
          const item = child[childIndex];
          if (isAstNode(item)) stack.push(item);
        }
        continue;
      }
      if (isAstNode(child)) stack.push(child);
    }
  }
};
