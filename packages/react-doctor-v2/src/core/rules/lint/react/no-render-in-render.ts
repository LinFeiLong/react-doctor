import { defineRule } from "../../registry.js";
import { RENDER_FUNCTION_PATTERN, isNodeOfType } from "./utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "./utils/index.js";

export const noRenderInRender = defineRule<Rule>({
  recommendation:
    "Do not call render functions while rendering; return JSX directly or compose components normally.",
  examples: [
    {
      before: `return renderHeader();`,
      after: `return <Header />;`,
    },
  ],
  create: (context: RuleContext) => {
    let didReportForFile = false;

    return {
      JSXExpressionContainer(node: EsTreeNode) {
        if (didReportForFile) return;
        const expression = node.expression;
        if (!isNodeOfType(expression, "CallExpression")) return;

        let calleeName: string | null = null;
        if (isNodeOfType(expression.callee, "Identifier")) {
          calleeName = expression.callee.name;
        } else if (
          isNodeOfType(expression.callee, "MemberExpression") &&
          isNodeOfType(expression.callee.property, "Identifier")
        ) {
          calleeName = expression.callee.property.name;
        }

        if (calleeName && RENDER_FUNCTION_PATTERN.test(calleeName)) {
          didReportForFile = true;
          context.report({
            node: expression,
            message: `Inline render function "${calleeName}()" - extract to a separate component for proper reconciliation`,
          });
        }
      },
    };
  },
});
