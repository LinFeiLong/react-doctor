import { defineRule } from "../../registry.js";
import {
  PROPERTY_ACCESS_REPEAT_THRESHOLD,
  buildMemberAccessKey,
  walkAst,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const jsCachePropertyAccess = defineRule<Rule>({
  recommendation:
    "Cache repeated deep property reads in a local variable inside hot loops or render paths.",
  examples: [
    {
      before: `for (const item of items) total += item.deep.value;`,
      after: `for (const item of items) { const value = item.deep.value; total += value; }`,
    },
  ],
  create: (context: RuleContext) => {
    const inspectLoopBody = (loopBody: EsTreeNode): void => {
      const counts = new Map<string, { count: number; firstNode: EsTreeNode }>();
      walkAst(loopBody, (child: EsTreeNode) => {
        if (!isNodeOfType(child, "MemberExpression")) return;
        if (child.computed) return;
        // Skip if this MemberExpression is itself nested inside another (only
        // count the deepest reference per chain).
        if (isNodeOfType(child.parent, "MemberExpression") && child.parent.object === child) return;
        const key = buildMemberAccessKey(child);
        if (!key) return;
        if (key.split(".").length < 3) return;
        const existing = counts.get(key);
        if (existing) {
          existing.count++;
        } else {
          counts.set(key, { count: 1, firstNode: child });
        }
      });

      for (const [key, { count, firstNode }] of counts) {
        if (count >= PROPERTY_ACCESS_REPEAT_THRESHOLD) {
          context.report({
            node: firstNode,
            message: `${key} is read ${count} times inside this loop - hoist into a const at the top of the loop body`,
          });
        }
      }
    };

    const handleLoop = (node: EsTreeNode): void => {
      if (node.body) inspectLoopBody(node.body);
    };

    return {
      ForStatement: handleLoop,
      ForInStatement: handleLoop,
      ForOfStatement: handleLoop,
      WhileStatement: handleLoop,
      DoWhileStatement: handleLoop,
    };
  },
});
