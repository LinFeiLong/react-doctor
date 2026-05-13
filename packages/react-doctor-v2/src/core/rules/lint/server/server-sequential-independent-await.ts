import { defineRule } from "../../registry.js";
import {
  collectDeclaredNames,
  declarationReadsAnyName,
  declarationStartsWithAwait,
  isNodeOfType,
} from "./utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "./utils/index.js";

export const serverSequentialIndependentAwait = defineRule<Rule>({
  recommendation:
    "Start independent server awaits before awaiting either result, then resolve them with Promise.all.",
  examples: [
    {
      before: `const user = await getUser();
const products = await getProducts();`,
      after: `const [user, products] = await Promise.all([getUser(), getProducts()]);`,
    },
  ],
  create: (context: RuleContext) => {
    const filename = context.getFilename?.() ?? "";
    const isTestOrInfraFile =
      /(?:\.(?:test|spec|stories|e2e|integration)\.[tj]sx?$|\/(?:__tests__|tests?|__mocks__|__fixtures__|fixtures)\/)/.test(
        filename,
      );

    const inspectStatements = (statements: EsTreeNode[]): void => {
      if (isTestOrInfraFile) return;
      for (let statementIndex = 0; statementIndex < statements.length - 1; statementIndex++) {
        const currentStatement = statements[statementIndex];
        if (!isNodeOfType(currentStatement, "VariableDeclaration")) continue;
        if (!declarationStartsWithAwait(currentStatement)) continue;
        const declaredNames = collectDeclaredNames(currentStatement);

        const nextStatement = statements[statementIndex + 1];
        if (!isNodeOfType(nextStatement, "VariableDeclaration")) continue;
        if (!declarationStartsWithAwait(nextStatement)) continue;

        if (declarationReadsAnyName(nextStatement, declaredNames)) continue;

        context.report({
          node: nextStatement,
          message:
            "Sequential `await` without a data dependency on the previous result - wrap the independent calls in `Promise.all([...])` so they race instead of waterfalling",
        });
        // Skip past the next so we don't double-report a chain.
        statementIndex++;
      }
    };

    const visitFunctionBody = (node: EsTreeNode): void => {
      if (!node.async) return;
      if (!isNodeOfType(node.body, "BlockStatement")) return;
      inspectStatements(node.body.body ?? []);
    };

    return {
      FunctionDeclaration: visitFunctionBody,
      FunctionExpression: visitFunctionBody,
      ArrowFunctionExpression: visitFunctionBody,
    };
  },
});
