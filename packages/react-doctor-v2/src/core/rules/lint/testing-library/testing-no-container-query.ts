import { defineRule } from "../../registry.js";
import { getMemberPropertyName, getRootIdentifierName, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const CONTAINER_QUERY_METHODS = new Set(["getElementById", "querySelector", "querySelectorAll"]);

export const testingNoContainerQuery = defineRule<Rule>({
  recommendation:
    "Query tests through screen and accessible roles/text instead of container DOM selectors so tests exercise user-visible behavior.",
  examples: [
    {
      before: `const submit = container.querySelector("button[type=submit]");`,
      after: `const submit = screen.getByRole("button", { name: /submit/i });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;
      const rootName = getRootIdentifierName(node.callee);
      const methodName = getMemberPropertyName(node.callee);
      if (rootName !== "container" || !methodName || !CONTAINER_QUERY_METHODS.has(methodName))
        return;
      context.report({
        node,
        message: `container.${methodName}() bypasses Testing Library queries - use screen.getByRole/getByText for user-visible behavior`,
      });
    },
  }),
});
