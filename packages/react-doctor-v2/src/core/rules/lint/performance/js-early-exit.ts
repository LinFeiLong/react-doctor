import { defineRule } from "../../registry.js";
import { DEEP_NESTING_THRESHOLD, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const jsEarlyExit = defineRule<Rule>({
  recommendation:
    "Return early from invalid or empty branches so the main path stays shallow and unnecessary work is skipped.",
  examples: [
    {
      before: `if (items.length) { process(items); return true; } return false;`,
      after: `if (items.length === 0) return false;
process(items);
return true;`,
    },
  ],
  create: (context: RuleContext) => ({
    IfStatement(node: EsTreeNode) {
      if (!isNodeOfType(node.consequent, "BlockStatement") || !node.consequent.body) return;

      let nestingDepth = 0;
      let currentBlock = node.consequent;
      while (isNodeOfType(currentBlock, "BlockStatement") && currentBlock.body?.length === 1) {
        const innerStatement = currentBlock.body[0];
        if (!isNodeOfType(innerStatement, "IfStatement")) break;
        nestingDepth++;
        currentBlock = innerStatement.consequent;
      }

      if (nestingDepth >= DEEP_NESTING_THRESHOLD) {
        context.report({
          node,
          message: `${nestingDepth + 1} levels of nested if statements - use early returns to flatten`,
        });
      }
    },
  }),
});
