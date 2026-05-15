import type { EsTreeNode } from "../../../utils/es-tree-node.js";
import { isNodeOfType } from "../../../utils/is-node-of-type.js";
import { walkAst } from "../../../utils/walk-ast.js";

const DOCUMENT_CLASS_LIST_MUTATION_METHOD_NAMES = new Set(["add", "remove", "toggle"]);
const DOCUMENT_CLASS_LIST_TARGET_NAMES = new Set(["body", "documentElement"]);

export const findDocumentClassListMutationName = (node: EsTreeNode): string | null => {
  let mutationName: string | null = null;
  walkAst(node, (child: EsTreeNode) => {
    if (mutationName) return false;
    if (!isNodeOfType(child, "CallExpression")) return;
    const callee = child.callee;
    if (
      !isNodeOfType(callee, "MemberExpression") ||
      !isNodeOfType(callee.property, "Identifier") ||
      !DOCUMENT_CLASS_LIST_MUTATION_METHOD_NAMES.has(callee.property.name)
    ) {
      return;
    }
    const classListExpression = callee.object;
    if (
      !isNodeOfType(classListExpression, "MemberExpression") ||
      !isNodeOfType(classListExpression.property, "Identifier") ||
      classListExpression.property.name !== "classList"
    ) {
      return;
    }
    const elementExpression = classListExpression.object;
    if (
      !isNodeOfType(elementExpression, "MemberExpression") ||
      !isNodeOfType(elementExpression.object, "Identifier") ||
      elementExpression.object.name !== "document" ||
      !isNodeOfType(elementExpression.property, "Identifier") ||
      !DOCUMENT_CLASS_LIST_TARGET_NAMES.has(elementExpression.property.name)
    ) {
      return;
    }
    mutationName = `document.${elementExpression.property.name}.classList.${callee.property.name}`;
  });
  return mutationName;
};
