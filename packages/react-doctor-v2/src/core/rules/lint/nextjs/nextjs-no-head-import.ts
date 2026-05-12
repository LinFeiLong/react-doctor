import { defineRule } from "../../registry.js";
import { APP_DIRECTORY_PATTERN } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsNoHeadImport = defineRule<Rule>({
  recommendation:
    "Use the App Router metadata API or next/head in Pages Router only; do not import next/head in App Router files.",
  examples: [
    {
      before: `import Head from "next/head";`,
      after: `export const metadata = { title: "Home" };`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      if (node.source?.value !== "next/head") return;

      const filename = context.getFilename?.() ?? "";
      if (!APP_DIRECTORY_PATTERN.test(filename)) return;

      context.report({
        node,
        message: "next/head is not supported in the App Router - use the Metadata API instead",
      });
    },
  }),
});
