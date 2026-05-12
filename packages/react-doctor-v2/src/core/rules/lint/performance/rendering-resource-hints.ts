import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const resourceHintFunctions = new Set([
  "preconnect",
  "prefetchDNS",
  "preload",
  "preloadModule",
  "preinit",
  "preinitModule",
]);

export const renderingResourceHints = defineRule<Rule>({
  recommendation:
    "Use React DOM resource hint APIs such as preconnect, preload, and preinit instead of hand-authored link hints in React markup.",
  examples: [
    {
      before: `<link rel="preload" href="/font.woff2" />`,
      after: `preload("/font.woff2", { as: "font" });`,
    },
  ],
  create: (context: RuleContext) => {
    let hasReactDomResourceHintImport = false;

    return {
      ImportDeclaration(node: EsTreeNode) {
        if (node.source?.value !== "react-dom") return;
        for (const specifier of node.specifiers ?? []) {
          if (!isNodeOfType(specifier, "ImportSpecifier")) continue;
          const importedName = specifier.imported?.name;
          if (resourceHintFunctions.has(importedName)) hasReactDomResourceHintImport = true;
        }
      },
      JSXOpeningElement(node: EsTreeNode) {
        if (hasReactDomResourceHintImport) return;
        if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "link") return;
        for (const attribute of node.attributes ?? []) {
          if (!isNodeOfType(attribute, "JSXAttribute")) continue;
          if (!isNodeOfType(attribute.name, "JSXIdentifier") || attribute.name.name !== "rel")
            continue;
          const value = attribute.value;
          if (
            isNodeOfType(value, "Literal") &&
            ["preload", "preconnect", "prefetch", "dns-prefetch"].includes(String(value.value))
          ) {
            context.report({
              node,
              message:
                "manual <link> resource hint in React code - prefer React DOM resource hint APIs like preload(), preconnect(), or preinit() so hints participate in React rendering",
            });
          }
        }
      },
    };
  },
});
