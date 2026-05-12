import { defineRule } from "../../registry.js";
import { findJsxAttribute, hasJsxAttribute, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noUndeferredThirdParty = defineRule<Rule>({
  recommendation:
    "Load analytics, embeds, and other third-party scripts after hydration or user intent using a deferred framework strategy.",
  examples: [
    {
      before: `<script src="https://analytics.example/script.js" />`,
      after: `<Script src="https://analytics.example/script.js" strategy="afterInteractive" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "script") return;
      const attributes = node.attributes ?? [];
      if (!findJsxAttribute(attributes, "src")) return;

      if (!hasJsxAttribute(attributes, "defer") && !hasJsxAttribute(attributes, "async")) {
        context.report({
          node,
          message:
            "Synchronous <script> with src - add defer or async to avoid blocking first paint",
        });
      }
    },
  }),
});
