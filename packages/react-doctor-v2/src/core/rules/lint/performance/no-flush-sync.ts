import { defineRule } from "../../registry.js";
import { isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

export const noFlushSync = defineRule<Rule>({
  recommendation:
    "Remove flushSync unless a browser API requires the DOM to be updated synchronously before the next line runs.",
  examples: [
    {
      before: `flushSync(() => setOpen(true));`,
      after: `setOpen(true);`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (node.source?.value !== "react-dom") return;
      for (const specifier of node.specifiers ?? []) {
        if (!isNodeOfType(specifier, "ImportSpecifier")) continue;
        if (specifier.imported?.name === "flushSync") {
          context.report({
            node: specifier,
            message:
              "flushSync from react-dom skips View Transition snapshots and concurrent rendering - prefer startTransition for non-urgent updates",
          });
        }
      }
    },
  }),
});
