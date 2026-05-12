import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const jsFlatmapFilter = defineRule<Rule>({
  recommendation:
    "Use flatMap when mapping and filtering into a new array can be done in a single pass.",
  examples: [
    {
      before: `items.map(toRow).filter(Boolean);`,
      after: `items.flatMap((item) => { const row = toRow(item); return row ? [row] : []; });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;
      if (!isNodeOfType(node.callee.property, "Identifier")) return;

      const outerMethod = node.callee.property.name;
      if (outerMethod !== "filter") return;

      const filterArgument = node.arguments?.[0];
      if (!filterArgument) return;

      const isIdentityArrow =
        isNodeOfType(filterArgument, "ArrowFunctionExpression") &&
        filterArgument.params?.length === 1 &&
        isNodeOfType(filterArgument.body, "Identifier") &&
        isNodeOfType(filterArgument.params[0], "Identifier") &&
        filterArgument.body.name === filterArgument.params[0].name;

      const isFilterBoolean =
        (isNodeOfType(filterArgument, "Identifier") && filterArgument.name === "Boolean") ||
        isIdentityArrow;

      if (!isFilterBoolean) return;

      const innerCall = node.callee.object;
      if (!isNodeOfType(innerCall, "CallExpression")) return;
      if (!isNodeOfType(innerCall.callee, "MemberExpression")) return;
      if (!isNodeOfType(innerCall.callee.property, "Identifier")) return;

      const innerMethod = innerCall.callee.property.name;
      if (innerMethod !== "map") return;

      context.report({
        node,
        message:
          ".map().filter(Boolean) iterates twice - use .flatMap() to transform and filter in a single pass",
      });
    },
  }),
});
