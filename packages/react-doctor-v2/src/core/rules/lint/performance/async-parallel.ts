import { defineRule } from "../../registry.js";
import {
  SEQUENTIAL_AWAIT_THRESHOLD,
  TEST_FILE_PATTERN,
  reportIfIndependent,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const asyncParallel = defineRule<Rule>({
  recommendation:
    "Run independent async operations in parallel with Promise.all instead of awaiting them one after another.",
  examples: [
    {
      before: `const user = await getUser();
const teams = await getTeams();`,
      after: `const [user, teams] = await Promise.all([getUser(), getTeams()]);`,
    },
  ],
  create: (context: RuleContext) => {
    const filename = context.getFilename?.() ?? "";
    const isTestFile = TEST_FILE_PATTERN.test(filename);

    return {
      BlockStatement(node: EsTreeNode) {
        if (isTestFile) return;
        const consecutiveAwaitStatements: EsTreeNode[] = [];

        const flushConsecutiveAwaits = (): void => {
          if (consecutiveAwaitStatements.length >= SEQUENTIAL_AWAIT_THRESHOLD) {
            reportIfIndependent(consecutiveAwaitStatements, context);
          }
          consecutiveAwaitStatements.length = 0;
        };

        for (const statement of node.body ?? []) {
          const isAwaitStatement =
            (isNodeOfType(statement, "VariableDeclaration") &&
              statement.declarations?.length === 1 &&
              isNodeOfType(statement.declarations[0].init, "AwaitExpression")) ||
            (isNodeOfType(statement, "ExpressionStatement") &&
              isNodeOfType(statement.expression, "AwaitExpression"));

          if (isAwaitStatement) {
            consecutiveAwaitStatements.push(statement);
          } else {
            flushConsecutiveAwaits();
          }
        }
        flushConsecutiveAwaits();
      },
    };
  },
});
