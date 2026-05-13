import { defineRule } from "../../registry.js";
import {
  SEQUENTIAL_AWAIT_THRESHOLD,
  TEST_OR_INFRA_FILE_PATTERN,
  reportIfIndependent,
  isNodeOfType,
} from "./utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "./utils/index.js";

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
    const isTestOrInfraFile = TEST_OR_INFRA_FILE_PATTERN.test(filename);

    return {
      BlockStatement(node: EsTreeNode) {
        if (isTestOrInfraFile) return;
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
