import { defineRule } from "../../registry.js";
import { SWR_HOOK_NAMES, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const isEmptyString = (node: EsTreeNode | undefined): boolean =>
  isNodeOfType(node, "Literal") && node.value === "";

export const swrNoEmptyKey = defineRule<Rule>({
  recommendation:
    "Use null to disable SWR requests; an empty string key is an ambiguous cache key and hides the condition that controls fetching.",
  examples: [
    {
      before: `useSWR(userId ? ["/api/user", userId] : "", fetcher);`,
      after: `useSWR(userId ? ["/api/user", userId] : null, fetcher);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const calleeName = isNodeOfType(node.callee, "Identifier") ? node.callee.name : null;
      if (!calleeName || !SWR_HOOK_NAMES.has(calleeName)) return;
      const keyArgument = node.arguments?.[0];
      const hasEmptyKey =
        isEmptyString(keyArgument) ||
        (isNodeOfType(keyArgument, "ConditionalExpression") &&
          (isEmptyString(keyArgument.consequent) || isEmptyString(keyArgument.alternate)));
      if (!hasEmptyKey) return;
      context.report({
        node: keyArgument,
        message:
          "SWR key uses an empty string to disable fetching - use null so the disabled state is explicit",
      });
    },
  }),
});
