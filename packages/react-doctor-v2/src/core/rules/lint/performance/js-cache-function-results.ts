import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const getSimpleCallKey = (node: EsTreeNode): string | null => {
  if (!isNodeOfType(node, "CallExpression")) return null;
  if (!isNodeOfType(node.callee, "Identifier")) return null;
  const argumentKeys: string[] = [];
  for (const argument of node.arguments ?? []) {
    if (isNodeOfType(argument, "Identifier")) argumentKeys.push(argument.name);
    else if (isNodeOfType(argument, "Literal")) argumentKeys.push(String(argument.value));
    else return null;
  }
  return `${node.callee.name}(${argumentKeys.join(",")})`;
};

export const jsCacheFunctionResults = defineRule<Rule>({
  recommendation:
    "Store repeated pure function results in a local variable or module-level cache when the same inputs are computed multiple times.",
  examples: [
    {
      before: `const a = formatPrice(value);
const b = formatPrice(value);`,
      after: `const formattedPrice = formatPrice(value);`,
    },
  ],
  create: (context: RuleContext) => ({
    BlockStatement(node: EsTreeNode) {
      const calls = new Map<string, EsTreeNode[]>();
      for (const statement of node.body ?? []) {
        if (!isNodeOfType(statement, "VariableDeclaration")) continue;
        for (const declarator of statement.declarations ?? []) {
          const key = getSimpleCallKey(declarator.init);
          if (!key) continue;
          const entries = calls.get(key) ?? [];
          entries.push(declarator.init);
          calls.set(key, entries);
        }
      }
      for (const [callKey, entries] of calls) {
        if (entries.length < 2) continue;
        context.report({
          node: entries[1],
          message: `${callKey} is computed repeatedly in the same block - cache the result in one variable or a module-level Map if it is reused across calls`,
        });
      }
    },
  }),
});
