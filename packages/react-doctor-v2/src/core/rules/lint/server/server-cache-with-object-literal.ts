import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const serverCacheWithObjectLiteral = defineRule<Rule>({
  recommendation:
    "Use stable primitive cache keys or explicit key builders instead of object literals that miss cache hits by identity.",
  examples: [
    {
      before: `cache.get({ id });`,
      after: `cache.get(\`user:\${id}\`);`,
    },
  ],
  create: (context: RuleContext) => {
    const cachedFunctionNames = new Set<string>();

    return {
      VariableDeclarator(node: EsTreeNode) {
        if (!isNodeOfType(node.id, "Identifier")) return;
        const init = node.init;
        if (!isNodeOfType(init, "CallExpression")) return;
        const callee = init.callee;
        const isCacheCall =
          (isNodeOfType(callee, "Identifier") && callee.name === "cache") ||
          (isNodeOfType(callee, "MemberExpression") &&
            isNodeOfType(callee.object, "Identifier") &&
            callee.object.name === "React" &&
            isNodeOfType(callee.property, "Identifier") &&
            callee.property.name === "cache");
        if (!isCacheCall) return;
        cachedFunctionNames.add(node.id.name);
      },
      CallExpression(node: EsTreeNode) {
        if (!isNodeOfType(node.callee, "Identifier")) return;
        if (!cachedFunctionNames.has(node.callee.name)) return;
        const firstArg = node.arguments?.[0];
        if (!isNodeOfType(firstArg, "ObjectExpression")) return;

        context.report({
          node,
          message: `${node.callee.name} is React.cache()-wrapped, but you're passing an object literal - the cache keys on argument identity, so a fresh {} per render bypasses dedup. Pass primitives or hoist the object`,
        });
      },
    };
  },
});
