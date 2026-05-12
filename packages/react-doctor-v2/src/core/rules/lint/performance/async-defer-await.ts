import { defineRule } from "../../registry.js";
import { collectIdentifierNames, isEarlyReturnIfStatement, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const asyncDeferAwait = defineRule<Rule>({
  recommendation:
    "Move awaits into the branch that needs the result so other branches can return without waiting.",
  examples: [
    {
      before: `const data = await loadData();
if (!enabled) return null;`,
      after: `if (!enabled) return null;
const data = await loadData();`,
    },
  ],
  create: (context: RuleContext) => {
    const inspectStatements = (statements: EsTreeNode[]): void => {
      for (let statementIndex = 0; statementIndex < statements.length - 1; statementIndex++) {
        const currentStatement = statements[statementIndex];
        if (!isNodeOfType(currentStatement, "VariableDeclaration")) continue;

        const awaitedBindingNames = new Set<string>();
        let didAwait = false;
        for (const declarator of currentStatement.declarations ?? []) {
          if (isNodeOfType(declarator.init, "AwaitExpression")) {
            didAwait = true;
            if (isNodeOfType(declarator.id, "Identifier")) {
              awaitedBindingNames.add(declarator.id.name);
            } else if (isNodeOfType(declarator.id, "ObjectPattern")) {
              for (const property of declarator.id.properties ?? []) {
                if (
                  isNodeOfType(property, "Property") &&
                  isNodeOfType(property.value, "Identifier")
                ) {
                  awaitedBindingNames.add(property.value.name);
                }
              }
            }
          }
        }
        if (!didAwait) continue;

        const nextStatement = statements[statementIndex + 1];
        if (!isEarlyReturnIfStatement(nextStatement)) continue;

        const testIdentifiers = new Set<string>();
        collectIdentifierNames(nextStatement.test, testIdentifiers);
        const usesAwaitedBinding = [...awaitedBindingNames].some((name) =>
          testIdentifiers.has(name),
        );
        if (usesAwaitedBinding) continue;

        const consequentIdentifiers = new Set<string>();
        collectIdentifierNames(nextStatement.consequent, consequentIdentifiers);
        const consequentUsesAwaited = [...awaitedBindingNames].some((name) =>
          consequentIdentifiers.has(name),
        );
        if (consequentUsesAwaited) continue;

        context.report({
          node: currentStatement,
          message:
            "await blocks the function before an early-return that doesn't use the awaited value - move the await after the synchronous guard so the skip path stays fast",
        });
      }
    };

    const enterFunction = (node: EsTreeNode): void => {
      if (!node.async) return;
      if (!isNodeOfType(node.body, "BlockStatement")) return;
      inspectStatements(node.body.body ?? []);
    };

    return {
      FunctionDeclaration: enterFunction,
      FunctionExpression: enterFunction,
      ArrowFunctionExpression: enterFunction,
    };
  },
});
