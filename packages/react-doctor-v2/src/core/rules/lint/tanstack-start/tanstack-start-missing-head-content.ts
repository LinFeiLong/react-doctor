import { defineRule } from "../../registry.js";
import { TANSTACK_ROOT_ROUTE_FILE_PATTERN, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartMissingHeadContent = defineRule<Rule>({
  recommendation:
    "Define head metadata for TanStack Start routes so title, description, and social previews are not omitted.",
  examples: [
    {
      before: `export const Route = createFileRoute("/items")({ component: Items });`,
      after: `export const Route = createFileRoute("/items")({ loader, head, component: Items });`,
    },
  ],
  create: (context: RuleContext) => {
    let hasHeadContentElement = false;

    return {
      JSXOpeningElement(node: EsTreeNode) {
        const filename = context.getFilename?.() ?? "";
        const isRootRouteFile = TANSTACK_ROOT_ROUTE_FILE_PATTERN.test(filename);
        if (!isRootRouteFile) return;

        if (isNodeOfType(node.name, "JSXIdentifier") && node.name.name === "HeadContent") {
          hasHeadContentElement = true;
        }
      },
      "Program:exit"(programNode: EsTreeNode) {
        const filename = context.getFilename?.() ?? "";
        const isRootRouteFile = TANSTACK_ROOT_ROUTE_FILE_PATTERN.test(filename);
        if (!isRootRouteFile) return;

        if (!hasHeadContentElement) {
          context.report({
            node: programNode,
            message:
              "Root route (__root) without <HeadContent /> - route head() meta tags won't render",
          });
        }
      },
    };
  },
});
