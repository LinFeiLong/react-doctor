import { defineRule } from "../../registry.js";
import { APP_ROUTER_FILE_PATTERN, PAGES_ROUTER_API_PATH_PATTERN } from "../server/_utils.js";
import { collectIdentifierNames, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const isApiOrRouteFile = (filename: string): boolean =>
  APP_ROUTER_FILE_PATTERN.test(filename) || PAGES_ROUTER_API_PATH_PATTERN.test(filename);

export const asyncApiRoutes = defineRule<Rule>({
  recommendation:
    "Start independent promises at the top of route handlers or server actions, then await them together once all work has been kicked off.",
  examples: [
    {
      before: `const user = await getUser();
const settings = await getSettings();`,
      after: `const userPromise = getUser();
const settingsPromise = getSettings();
const [user, settings] = await Promise.all([userPromise, settingsPromise]);`,
    },
  ],
  create: (context: RuleContext) => {
    const filename = context.getFilename?.() ?? "";
    return {
      BlockStatement(node: EsTreeNode) {
        if (!isApiOrRouteFile(filename)) return;
        const statements = node.body ?? [];
        for (let statementIndex = 0; statementIndex < statements.length - 1; statementIndex++) {
          const currentStatement = statements[statementIndex];
          const nextStatement = statements[statementIndex + 1];
          if (!isNodeOfType(currentStatement, "VariableDeclaration")) continue;
          if (!isNodeOfType(nextStatement, "VariableDeclaration")) continue;
          const currentDeclarator = currentStatement.declarations?.[0];
          const nextDeclarator = nextStatement.declarations?.[0];
          if (!isNodeOfType(currentDeclarator.init, "AwaitExpression")) continue;
          if (!isNodeOfType(nextDeclarator.init, "AwaitExpression")) continue;

          const currentNames = new Set<string>();
          const nextReadNames = new Set<string>();
          collectIdentifierNames(currentDeclarator.id, currentNames);
          collectIdentifierNames(nextDeclarator.init, nextReadNames);
          if ([...currentNames].some((name) => nextReadNames.has(name))) continue;

          context.report({
            node: nextStatement,
            message:
              "API route/server action starts independent async work after a previous await - create promises first and await later to avoid route-handler waterfalls",
          });
        }
      },
    };
  },
});
