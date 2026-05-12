import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noEval = defineRule<Rule>({
  recommendation:
    "Remove eval-like execution and replace it with explicit parsing, safe lookup tables, or trusted compile-time code generation.",
  examples: [
    {
      before: `eval(userInput);`,
      after: `handlers[actionName]?.();`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (isNodeOfType(node.callee, "Identifier") && node.callee.name === "eval") {
        context.report({
          node,
          message: "eval() is a code injection risk - avoid dynamic code execution",
        });
        return;
      }

      if (
        isNodeOfType(node.callee, "Identifier") &&
        (node.callee.name === "setTimeout" || node.callee.name === "setInterval") &&
        isNodeOfType(node.arguments?.[0], "Literal") &&
        typeof node.arguments[0].value === "string"
      ) {
        context.report({
          node,
          message: `${node.callee.name}() with string argument executes code dynamically - use a function instead`,
        });
      }
    },
    NewExpression(node: EsTreeNode) {
      if (isNodeOfType(node.callee, "Identifier") && node.callee.name === "Function") {
        context.report({
          node,
          message: "new Function() is a code injection risk - avoid dynamic code execution",
        });
      }
    },
  }),
});
