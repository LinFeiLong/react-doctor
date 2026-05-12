import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const useLazyMotion = defineRule<Rule>({
  recommendation:
    "Use LazyMotion with a minimal feature bundle for Framer Motion so animation features load only when needed.",
  examples: [
    {
      before: `import { motion } from "framer-motion";`,
      after: `import { LazyMotion, domAnimation } from "framer-motion";`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportDeclaration(node: EsTreeNode) {
      const source = node.source?.value;
      if (source !== "framer-motion" && source !== "motion/react") return;

      const hasFullMotionImport = node.specifiers?.some(
        (specifier: EsTreeNode) =>
          isNodeOfType(specifier, "ImportSpecifier") && specifier.imported?.name === "motion",
      );

      if (hasFullMotionImport) {
        context.report({
          node,
          message: 'Import "m" with LazyMotion instead of "motion" - saves ~30kb in bundle size',
        });
      }
    },
  }),
});
