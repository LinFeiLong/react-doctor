import { defineRule } from "../../registry.js";
import { APP_ROUTER_FILE_PATTERN, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const expensiveServerCallPattern =
  /(?:fetch|query|findMany|findUnique|select|getUser|getSession|getCurrentUser)/;

export const serverCacheReact = defineRule<Rule>({
  recommendation:
    "Wrap shared server reads in React cache() so sibling Server Components dedupe the same request-scoped work.",
  examples: [
    {
      before: `export async function getUser(id) { return db.user.findUnique({ where: { id } }); }`,
      after: `export const getUser = cache(async (id) => db.user.findUnique({ where: { id } }));`,
    },
  ],
  create: (context: RuleContext) => {
    const filename = context.getFilename?.() ?? "";
    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!APP_ROUTER_FILE_PATTERN.test(filename)) return;
        if (!node.async) return;
        if (!node.id?.name || /^generate(?:Metadata|StaticParams)$/.test(node.id.name)) return;
        const body = node.body;
        if (!body) return;
        for (const statement of body.body ?? []) {
          if (!isNodeOfType(statement, "VariableDeclaration")) continue;
          const declarator = statement.declarations?.[0];
          const init = declarator?.init;
          const call = isNodeOfType(init, "AwaitExpression") ? init.argument : init;
          const callee = call?.callee;
          const calleeName = isNodeOfType(callee, "Identifier")
            ? callee.name
            : isNodeOfType(callee, "MemberExpression") &&
                isNodeOfType(callee.property, "Identifier")
              ? callee.property.name
              : null;
          if (!calleeName || !expensiveServerCallPattern.test(calleeName)) continue;
          context.report({
            node: statement,
            message:
              "server helper performs request-scoped async work without React.cache() - wrap shared reads in cache() so sibling Server Components dedupe the same request",
          });
          return;
        }
      },
    };
  },
});
