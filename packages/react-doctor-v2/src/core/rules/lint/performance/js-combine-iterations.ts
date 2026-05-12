import { defineRule } from "../../registry.js";
import { CHAINABLE_ITERATION_METHODS, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const jsCombineIterations = defineRule<Rule>({
  recommendation:
    "Combine chained array passes when they traverse the same data and the intermediate arrays are not needed.",
  examples: [
    {
      before: `const active = users.filter(isActive);
const names = active.map(getName);`,
      after: `const names = users.flatMap((user) => isActive(user) ? [getName(user)] : []);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (
        !isNodeOfType(node.callee, "MemberExpression") ||
        !isNodeOfType(node.callee.property, "Identifier")
      )
        return;

      const outerMethod = node.callee.property.name;
      if (!CHAINABLE_ITERATION_METHODS.has(outerMethod)) return;

      const innerCall = node.callee.object;
      if (
        !isNodeOfType(innerCall, "CallExpression") ||
        !isNodeOfType(innerCall.callee, "MemberExpression") ||
        !isNodeOfType(innerCall.callee.property, "Identifier")
      )
        return;

      const innerMethod = innerCall.callee.property.name;
      if (!CHAINABLE_ITERATION_METHODS.has(innerMethod)) return;

      if (innerMethod === "map" && outerMethod === "filter") {
        const filterArgument = node.arguments?.[0];
        const isBooleanOrIdentityFilter =
          (isNodeOfType(filterArgument, "Identifier") && filterArgument.name === "Boolean") ||
          (isNodeOfType(filterArgument, "ArrowFunctionExpression") &&
            filterArgument.params?.length === 1 &&
            isNodeOfType(filterArgument.body, "Identifier") &&
            isNodeOfType(filterArgument.params[0], "Identifier") &&
            filterArgument.body.name === filterArgument.params[0].name);
        if (isBooleanOrIdentityFilter) return;
      }

      context.report({
        node,
        message: `.${innerMethod}().${outerMethod}() iterates the array twice - combine into a single loop with .reduce() or for...of`,
      });
    },
  }),
});
