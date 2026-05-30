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
            "Attackers can inject code through eval(), since it runs any string as code. Don't build & run code from strings.",
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
          message: `Attackers can inject code through ${node.callee.name}() with a string argument, since it runs that string as code. Pass a function instead.`,
        });
      }
    },
    NewExpression(node: EsTreeNodeOfType<"NewExpression">) {
      if (isNodeOfType(node.callee, "Identifier") && node.callee.name === "Function") {
        context.report({
          node,
          message:
            "Attackers can inject code through new Function(), since it builds & runs code from a string. Don't build code from strings.",
        });
      }
    },
  }),
});
