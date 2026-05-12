import { defineRule } from "../../registry.js";
import { RADIX_PRIMITIVE_IMPORT_PATTERN, getImportSourceValue } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const shadcnNoDirectRadixImport = defineRule<Rule>({
  recommendation:
    "In shadcn/ui apps, import the local component wrapper from components/ui instead of importing Radix primitives directly in product code.",
  examples: [
    {
      before: `import * as Dialog from "@radix-ui/react-dialog";`,
      after: `import { Dialog, DialogContent } from "@/components/ui/dialog";`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      const source = getImportSourceValue(node);
      if (!source || !RADIX_PRIMITIVE_IMPORT_PATTERN.test(source)) return;
      context.report({
        node,
        message: `${source} imported directly - use the project's shadcn/ui wrapper so styling, tokens, and accessibility conventions stay centralized`,
      });
    },
  }),
});
