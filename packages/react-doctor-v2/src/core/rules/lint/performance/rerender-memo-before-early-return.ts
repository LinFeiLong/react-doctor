import { defineRule } from "../../registry.js";
import {
  callbackReturnsJsx,
  containsEarlyReturn,
  isComponentAssignment,
  isHookCall,
  isUppercaseName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rerenderMemoBeforeEarlyReturn = defineRule<Rule>({
  recommendation:
    "Move expensive memoized work below early returns by extracting a child component or computing after the bail-out branch.",
  examples: [
    {
      before: `const avatar = useMemo(() => compute(user), [user]);
if (loading) return null;`,
      after: `if (loading) return null;
return <Avatar user={user} />;`,
    },
  ],
  create: (context: RuleContext) => {
    const inspectFunctionBody = (statements: EsTreeNode[]): void => {
      let memoNode: EsTreeNode | null = null;

      for (const stmt of statements) {
        if (!memoNode) {
          if (!isNodeOfType(stmt, "VariableDeclaration")) continue;
          for (const declarator of stmt.declarations ?? []) {
            const init = declarator.init;
            if (
              isNodeOfType(init, "CallExpression") &&
              isHookCall(init, "useMemo") &&
              callbackReturnsJsx(init.arguments?.[0])
            ) {
              memoNode = declarator;
              break;
            }
          }
          continue;
        }
        if (isNodeOfType(stmt, "IfStatement") && containsEarlyReturn(stmt)) {
          context.report({
            node: memoNode,
            message:
              "useMemo returning JSX runs before an early return - extract the JSX into a memoized child component so the parent bails out before the subtree renders",
          });
          return;
        }
      }
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!isUppercaseName(node.id?.name ?? "")) return;
        if (!isNodeOfType(node.body, "BlockStatement")) return;
        inspectFunctionBody(node.body.body ?? []);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        const body = node.init?.body;
        if (!isNodeOfType(body, "BlockStatement")) return;
        inspectFunctionBody(body.body ?? []);
      },
    };
  },
});
