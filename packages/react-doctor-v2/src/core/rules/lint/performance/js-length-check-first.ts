import { defineRule } from "../../registry.js";
import { isMemberProperty, walkAst, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

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
      if (params.length < 2) return; // need (item, index, ...) to address other array

      // Look for `other[index]` access in the body, suggesting elementwise compare.
      let referencesOtherArrayByIndex = false;
      walkAst(callback.body, (child: EsTreeNode) => {
        if (referencesOtherArrayByIndex) return;
        if (
          isNodeOfType(child, "MemberExpression") &&
          child.computed &&
          isNodeOfType(child.property, "Identifier") &&
          isNodeOfType(params[1], "Identifier") &&
          child.property.name === params[1].name
        ) {
          referencesOtherArrayByIndex = true;
        }
      });

      if (!referencesOtherArrayByIndex) return;

      // Walk up to ensure we're not already inside a length-check guard.
      let guard: EsTreeNode | null = node.parent ?? null;
      while (
        guard &&
        !isNodeOfType(guard, "LogicalExpression") &&
        !isNodeOfType(guard, "IfStatement")
      ) {
        guard = guard.parent ?? null;
      }
      if (isNodeOfType(guard, "LogicalExpression") && guard.operator === "&&") {
        const left = guard.left;
        if (
          isNodeOfType(left, "BinaryExpression") &&
          left.operator === "===" &&
          (isMemberProperty(left.left, "length") || isMemberProperty(left.right, "length"))
        ) {
          return;
        }
      }

      context.report({
        node,
        message:
          ".every() over an array compared to another array - short-circuit with `a.length === b.length && a.every(...)` so unequal-length arrays exit immediately",
      });
    },
  }),
});
