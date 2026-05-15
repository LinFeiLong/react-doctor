import { defineRule } from "../../utils/define-rule.js";
import { isBarrelIndexModule } from "../../utils/is-barrel-index-module.js";
import { resolveRelativeImportPath } from "../../utils/resolve-relative-import-path.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";

export const noBarrelImport = defineRule<Rule>({
  id: "no-barrel-import",
  severity: "warn",
  recommendation:
    "Import from the direct path: `import { Button } from './components/Button'` instead of `./components`",
  create: (context: RuleContext) => {
    let didReportForFile = false;

    return {
      ImportDeclaration(node: EsTreeNodeOfType<"ImportDeclaration">) {
        if (didReportForFile) return;

        const source = node.source?.value;
        if (typeof source !== "string" || !source.startsWith(".")) return;

        const filename = context.getFilename?.() ?? "";
        if (!filename) return;

        const resolvedImportPath = resolveRelativeImportPath(filename, source);
        if (resolvedImportPath && isBarrelIndexModule(resolvedImportPath)) {
          didReportForFile = true;
          context.report({
            node,
            message:
              "Import from barrel/index file — import directly from the source module for better tree-shaking",
          });
        }
      },
    };
  },
});
