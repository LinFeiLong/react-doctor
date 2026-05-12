import { defineRule } from "../../registry.js";
import { collectIdentifierNames, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const isAwaitedPromiseAll = (node: EsTreeNode | null | undefined): boolean =>
  isNodeOfType(node, "AwaitExpression") &&
  isNodeOfType(node.argument, "CallExpression") &&
  isNodeOfType(node.argument.callee, "MemberExpression") &&
  isNodeOfType(node.argument.callee.object, "Identifier") &&
  node.argument.callee.object.name === "Promise" &&
  isNodeOfType(node.argument.callee.property, "Identifier") &&
  node.argument.callee.property.name === "all";

export const asyncDependencies = defineRule<Rule>({
  recommendation:
    "Start partially dependent async work as early as possible or use a dependency-aware parallelization helper so only real dependencies wait.",
  examples: [
    {
      before: `const [user] = await Promise.all([getUser()]);
const posts = await getPosts(user.id);`,
      after: `const user = await getUser();
const postsPromise = getPosts(user.id);`,
    },
  ],
  create: (context: RuleContext) => ({
    BlockStatement(node: EsTreeNode) {
      const statements = node.body ?? [];
      for (let statementIndex = 0; statementIndex < statements.length - 1; statementIndex++) {
        const promiseAllStatement = statements[statementIndex];
        if (!isNodeOfType(promiseAllStatement, "VariableDeclaration")) continue;
        const promiseAllDeclarator = promiseAllStatement.declarations?.[0];
        if (!promiseAllDeclarator || !isAwaitedPromiseAll(promiseAllDeclarator.init)) continue;
        const declaredNames = new Set<string>();
        collectIdentifierNames(promiseAllDeclarator.id, declaredNames);
        if (declaredNames.size === 0) continue;

        const nextStatement = statements[statementIndex + 1];
        if (!isNodeOfType(nextStatement, "VariableDeclaration")) continue;
        const nextDeclarator = nextStatement.declarations?.[0];
        if (!isNodeOfType(nextDeclarator.init, "AwaitExpression")) continue;
        const readNames = new Set<string>();
        collectIdentifierNames(nextDeclarator.init, readNames);
        const readsPrevious = [...declaredNames].some((name) => readNames.has(name));
        if (!readsPrevious) continue;

        context.report({
          node: nextStatement,
          message:
            "await after Promise.all depends on only part of the result - start the dependent promise as early as possible, or use dependency-aware parallelization like better-all",
        });
      }
    },
  }),
});
