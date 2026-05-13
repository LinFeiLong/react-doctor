import { defineRule } from "../../registry.js";
import { isMemberProperty, walkAst, isNodeOfType } from "./utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "./utils/index.js";

const isEqualityLengthComparison = (node: EsTreeNode): boolean =>
  isNodeOfType(node, "BinaryExpression") &&
  (node.operator === "===" || node.operator === "==") &&
  (isMemberProperty(node.left, "length") || isMemberProperty(node.right, "length"));

const isInequalityLengthComparison = (node: EsTreeNode): boolean =>
  isNodeOfType(node, "BinaryExpression") &&
  (node.operator === "!==" || node.operator === "!=") &&
  (isMemberProperty(node.left, "length") || isMemberProperty(node.right, "length"));

const isDescendantOf = (node: EsTreeNode, target: EsTreeNode | null | undefined): boolean => {
  let current: EsTreeNode | null | undefined = node;
  while (current) {
    if (current === target) return true;
    current = current.parent;
  }
  return false;
};

const isInsideLengthGuard = (node: EsTreeNode): boolean => {
  let ancestor: EsTreeNode | null = node.parent ?? null;
  while (ancestor) {
    if (
      isNodeOfType(ancestor, "LogicalExpression") &&
      ancestor.operator === "&&" &&
      isEqualityLengthComparison(ancestor.left)
    ) {
      return true;
    }
    if (isNodeOfType(ancestor, "IfStatement")) {
      const isInTrueBranch = isDescendantOf(node, ancestor.consequent);
      const isInFalseBranch = isDescendantOf(node, ancestor.alternate);
      if (isInTrueBranch && isEqualityLengthComparison(ancestor.test)) return true;
      if (isInFalseBranch && isInequalityLengthComparison(ancestor.test)) return true;
    }
    if (isNodeOfType(ancestor, "ConditionalExpression")) {
      const isInTrueBranch = isDescendantOf(node, ancestor.consequent);
      const isInFalseBranch = isDescendantOf(node, ancestor.alternate);
      if (isInTrueBranch && isEqualityLengthComparison(ancestor.test)) return true;
      if (isInFalseBranch && isInequalityLengthComparison(ancestor.test)) return true;
    }
    ancestor = ancestor.parent ?? null;
  }
  return false;
};

const isIndexedMemberAccess = (node: EsTreeNode, indexName: string): boolean =>
  isNodeOfType(node, "MemberExpression") &&
  node.computed &&
  isNodeOfType(node.property, "Identifier") &&
  node.property.name === indexName;

export const jsLengthCheckFirst = defineRule<Rule>({
  recommendation: "Check array lengths before doing expensive element-by-element comparisons.",
  examples: [
    {
      before: `return a.every((value, index) => value === b[index]);`,
      after: `return a.length === b.length && a.every((value, index) => value === b[index]);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;
      if (!isNodeOfType(node.callee.property, "Identifier")) return;
      if (node.callee.property.name !== "every") return;

      const callback = node.arguments?.[0];
      if (
        !isNodeOfType(callback, "ArrowFunctionExpression") &&
        !isNodeOfType(callback, "FunctionExpression")
      ) {
        return;
      }
      const params = callback.params ?? [];
      if (params.length < 2) return;

      const indexParam = params[1];
      if (!isNodeOfType(indexParam, "Identifier")) return;

      const indexName = indexParam.name;
      let hasElementWiseComparison = false;
      walkAst(callback.body, (child: EsTreeNode) => {
        if (hasElementWiseComparison) return;
        if (
          !isNodeOfType(child, "BinaryExpression") ||
          (child.operator !== "===" && child.operator !== "!==")
        ) {
          return;
        }
        if (
          isIndexedMemberAccess(child.left, indexName) ||
          isIndexedMemberAccess(child.right, indexName)
        ) {
          hasElementWiseComparison = true;
        }
      });

      if (!hasElementWiseComparison) return;
      if (isInsideLengthGuard(node)) return;

      context.report({
        node,
        message:
          ".every() over an array compared to another array - short-circuit with `a.length === b.length && a.every(...)` so unequal-length arrays exit immediately",
      });
    },
  }),
});
