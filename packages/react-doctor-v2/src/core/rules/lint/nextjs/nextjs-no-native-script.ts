import { defineRule } from "../../registry.js";
import { EXECUTABLE_SCRIPT_TYPES, findJsxAttribute, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsNoNativeScript = defineRule<Rule>({
  recommendation:
    "Use next/script with an explicit loading strategy instead of raw script tags for third-party and inline scripts.",
  examples: [
    {
      before: `<script src="/widget.js" />`,
      after: `<Script src="/widget.js" strategy="afterInteractive" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "script") return;

      const typeAttribute = findJsxAttribute(node.attributes ?? [], "type");
      const typeValue = isNodeOfType(typeAttribute?.value, "Literal")
        ? typeAttribute.value.value
        : null;
      if (typeof typeValue === "string" && !EXECUTABLE_SCRIPT_TYPES.has(typeValue)) return;

      context.report({
        node,
        message:
          "Use next/script <Script> instead of <script> - provides loading strategy optimization and deferred loading",
      });
    },
  }),
});
