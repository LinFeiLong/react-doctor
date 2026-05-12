import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noDynamicImportPath = defineRule<Rule>({
  recommendation:
    "Use static dynamic import specifiers or an explicit import map so bundlers can split and prefetch chunks safely.",
  examples: [
    {
      before: `import(\`./widgets/\${name}.tsx\`);`,
      after: `const widgets = { chart: () => import("./widgets/chart") };`,
    },
  ],
  create: (context: RuleContext) => ({
    ImportExpression(node: EsTreeNode) {
      const source = node.source;
      if (source && !isNodeOfType(source, "Literal") && !isNodeOfType(source, "TemplateLiteral")) {
        context.report({
          node,
          message:
            "Dynamic import path is not statically analyzable - use a string literal so the bundler can split this chunk",
        });
        return;
      }
      if (isNodeOfType(source, "TemplateLiteral") && (source.expressions?.length ?? 0) > 0) {
        context.report({
          node,
          message:
            "Template literal with interpolation in dynamic import - use a string literal so the bundler can split this chunk",
        });
      }
    },
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "Identifier") || node.callee.name !== "require") return;
      const argument = node.arguments?.[0];
      if (!argument) return;
      if (!isNodeOfType(argument, "Literal") && !isNodeOfType(argument, "TemplateLiteral")) {
        context.report({
          node,
          message:
            "Dynamic require() path is not statically analyzable - use a string literal so the bundler can trace this dependency",
        });
        return;
      }
      if (isNodeOfType(argument, "TemplateLiteral") && (argument.expressions?.length ?? 0) > 0) {
        context.report({
          node,
          message:
            "Template literal with interpolation in require() - use a string literal so the bundler can trace this dependency",
        });
      }
    },
  }),
});
