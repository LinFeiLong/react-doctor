import { defineRule } from "../../registry.js";
import { MUTABLE_CONTAINER_CONSTRUCTORS, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const serverCacheLru = defineRule<Rule>({
  recommendation:
    "Use a bounded LRU or TTL cache for cross-request server caching instead of an unbounded module-level Map or Set.",
  examples: [
    {
      before: `const cache = new Map();`,
      after: `const cache = new LRUCache({ max: 500, ttl: 60_000 });`,
    },
  ],
  create: (context: RuleContext) => ({
    VariableDeclarator(node: EsTreeNode) {
      if (!isNodeOfType(node.parent?.parent, "Program")) return;
      if (!isNodeOfType(node.init, "NewExpression")) return;
      if (!isNodeOfType(node.init.callee, "Identifier")) return;
      if (!MUTABLE_CONTAINER_CONSTRUCTORS.has(node.init.callee.name)) return;
      const bindingName = isNodeOfType(node.id, "Identifier") ? node.id.name : "cache";
      if (!/cache|memo|store/i.test(bindingName)) return;
      context.report({
        node,
        message:
          "module-level server cache uses an unbounded mutable container - use an LRU/TTL cache so cross-request caching cannot grow without bounds",
      });
    },
  }),
});
