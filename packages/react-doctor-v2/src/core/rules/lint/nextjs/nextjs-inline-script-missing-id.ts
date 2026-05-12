import { defineRule } from "../../registry.js";
import { hasJsxAttribute, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsInlineScriptMissingId = defineRule<Rule>({
  recommendation:
    "Add a stable id to inline Next.js Script blocks so Next.js can track and dedupe them.",
  examples: [
    {
      before: `<Script>{\`window.x = 1\`}</Script>`,
      after: `<Script id="bootstrap-x">{\`window.x = 1\`}</Script>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "Script") return;
      const attributes = node.attributes ?? [];

      if (hasJsxAttribute(attributes, "src")) return;
      if (hasJsxAttribute(attributes, "id")) return;

      context.report({
        node,
        message:
          "Inline <Script> without id - Next.js requires an id attribute to track inline scripts",
      });
    },
  }),
});
