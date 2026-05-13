import { defineRule } from "../../registry.js";
import { TEST_OR_INFRA_FILE_PATTERN, isNodeOfType } from "./utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "./utils/index.js";

const REACT_HOOK_PATTERN = /^use[A-Z]/;
const FACTORY_FUNCTION_PATTERN = /^(?:create|make|build|new|init|generate|clone)[A-Z]/;

const getSimpleCallKey = (node: EsTreeNode): string | null => {
  if (!isNodeOfType(node, "CallExpression")) return null;
  if (!isNodeOfType(node.callee, "Identifier")) return null;
  if (REACT_HOOK_PATTERN.test(node.callee.name)) return null;
  if (FACTORY_FUNCTION_PATTERN.test(node.callee.name)) return null;
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
  create: (context: RuleContext) => {
    const filename = context.getFilename?.() ?? "";
    const isTestOrInfraFile = TEST_OR_INFRA_FILE_PATTERN.test(filename);

    return {
      BlockStatement(node: EsTreeNode) {
        if (isTestOrInfraFile) return;
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
    };
  },
});
