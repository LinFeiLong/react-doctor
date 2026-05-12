import { defineRule } from "../../registry.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noMoment = defineRule<Rule>({
  recommendation:
    "Replace Moment with Intl, date-fns, Day.js, or another smaller date strategy appropriate for the feature.",
  examples: [
    {
      before: `import moment from "moment";`,
      after: `import { format } from "date-fns";`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (node.source?.value === "moment") {
        context.report({
          node,
          message: 'moment.js is 300kb+ - use "date-fns" or "dayjs" instead',
        });
      }
    },
  }),
});
