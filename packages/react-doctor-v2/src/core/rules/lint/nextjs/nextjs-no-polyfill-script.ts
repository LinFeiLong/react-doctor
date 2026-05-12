import { defineRule } from "../../registry.js";
import { POLYFILL_SCRIPT_PATTERN, findJsxAttribute, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsNoPolyfillScript = defineRule<Rule>({
  recommendation:
    "Remove legacy polyfill scripts unless the supported browser matrix still requires them, and load needed polyfills selectively.",
  examples: [
    {
      before: `<script src="/polyfills/legacy.js" />`,
      after: `import "core-js/actual/array/to-sorted";`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier")) return;
      if (node.name.name !== "script" && node.name.name !== "Script") return;

      const srcAttribute = findJsxAttribute(node.attributes ?? [], "src");
      if (!srcAttribute?.value) return;

      const srcValue = isNodeOfType(srcAttribute.value, "Literal")
        ? srcAttribute.value.value
        : null;

      if (typeof srcValue === "string" && POLYFILL_SCRIPT_PATTERN.test(srcValue)) {
        context.report({
          node,
          message:
            "Polyfill CDN script - Next.js includes polyfills for fetch, Promise, Object.assign, and 50+ others automatically",
        });
      }
    },
  }),
});
