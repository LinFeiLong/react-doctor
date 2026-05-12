import { defineRule } from "../../registry.js";
import { isIntlNewExpression, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const jsHoistIntl = defineRule<Rule>({
  recommendation:
    "Hoist Intl formatter construction to module scope or memoize it because formatter creation is expensive.",
  examples: [
    {
      before: `const label = new Intl.DateTimeFormat("en").format(date);`,
      after: `const DATE_FORMAT = new Intl.DateTimeFormat("en");
const label = DATE_FORMAT.format(date);`,
    },
  ],
  create: (context: RuleContext) => ({
    NewExpression(node: EsTreeNode) {
      if (!isIntlNewExpression(node)) return;
      // Walk up: if any enclosing function is a function/arrow, this is in
      // a function body. Module-scope `new Intl.X()` is fine; we only flag
      // when wrapped in a function (likely called per render or per item).
      let cursor: EsTreeNode | null = node.parent ?? null;
      let inFunctionBody = false;
      while (cursor) {
        if (
          isNodeOfType(cursor, "FunctionDeclaration") ||
          isNodeOfType(cursor, "FunctionExpression") ||
          isNodeOfType(cursor, "ArrowFunctionExpression")
        ) {
          inFunctionBody = true;
          break;
        }
        cursor = cursor.parent ?? null;
      }
      if (!inFunctionBody) return;

      const className = node.callee.property?.name ?? "Intl";
      context.report({
        node,
        message: `new Intl.${className}() inside a function - hoist to module scope or wrap in useMemo so it isn't recreated each call`,
      });
    },
  }),
});
