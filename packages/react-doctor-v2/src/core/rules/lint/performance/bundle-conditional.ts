import { defineRule } from "../../registry.js";
import { HEAVY_LIBRARIES } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const bundleConditional = defineRule<Rule>({
  recommendation:
    "Move optional or feature-gated heavy modules behind conditional dynamic imports so inactive users do not download or execute them.",
  examples: [
    {
      before: `import Fuse from "fuse.js";`,
      after: `if (query) { const Fuse = await import("fuse.js"); }`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      const source = node.source?.value;
      if (typeof source !== "string" || !HEAVY_LIBRARIES.has(source)) return;
      context.report({
        node,
        message: `"${source}" is loaded eagerly - if this feature is gated or optional, move it behind a conditional dynamic import so inactive users don't pay for it`,
      });
    },
  }),
});
