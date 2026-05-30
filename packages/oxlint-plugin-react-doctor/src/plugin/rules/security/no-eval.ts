import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";

export const noEval = defineRule<Rule>({
  id: "no-eval",
  title: "Use of eval()",
  severity: "error",
  recommendation:
    "Use `JSON.parse` for data, or rewrite the code so it doesn't build and run code from strings.",
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNodeOfType<"CallExpression">) {
      if (isNodeOfType(node.callee, "Identifier") && node.callee.name === "eval") {
        context.report({
          node,
          message:
            "eval() runs code from a string, which lets attackers inject code. Don't build and run code this way.",
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
          message: `${node.callee.name}() with a string argument runs that string as code. Pass a function instead.`,
        });
      }
    },
    NewExpression(node: EsTreeNodeOfType<"NewExpression">) {
      if (isNodeOfType(node.callee, "Identifier") && node.callee.name === "Function") {
        context.report({
          node,
          message:
            "new Function() builds and runs code from a string, which lets attackers inject code. Don't build code this way.",
        });
      }
    },
  }),
});
