import { defineRule } from "../../registry.js";
import { createLoopAwareVisitors, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const jsIndexMaps = defineRule<Rule>({
  recommendation:
    "Build a Map keyed by id for repeated joins or lookups instead of calling find inside loops.",
  examples: [
    {
      before: `users.map((user) => posts.find((post) => post.userId === user.id));`,
      after: `const postsByUserId = new Map(posts.map((post) => [post.userId, post]));`,
    },
  ],
  create: (context: RuleContext) =>
    createLoopAwareVisitors({
      CallExpression(node: EsTreeNode) {
        if (
          !isNodeOfType(node.callee, "MemberExpression") ||
          !isNodeOfType(node.callee.property, "Identifier")
        )
          return;
        const methodName = node.callee.property.name;
        if (methodName === "find" || methodName === "findIndex") {
          context.report({
            node,
            message: `array.${methodName}() in a loop is O(n*m) - build a Map for O(1) lookups`,
          });
        }
      },
    }),
});
