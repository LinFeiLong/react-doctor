import { defineRule } from "../../registry.js";
import {
  GIANT_COMPONENT_LINE_THRESHOLD,
  isComponentAssignment,
  isUppercaseName,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noGiantComponent = defineRule<Rule>({
  recommendation:
    "Split large components by responsibility into smaller components or hooks so rendering, state, and effects stay local.",
  examples: [
    {
      before: `function Dashboard() { return <>{header}{filters}{table}{modal}</>; }`,
      after: `function Dashboard() { return <><DashboardHeader /><Filters /><DataTable /><EditModal /></>; }`,
    },
  ],
  create: (context: RuleContext) => {
    const reportOversizedComponent = (
      nameNode: EsTreeNode,
      componentName: string,
      bodyNode: EsTreeNode,
    ): void => {
      if (!bodyNode.loc) return;
      const lineCount = bodyNode.loc.end.line - bodyNode.loc.start.line + 1;
      if (lineCount > GIANT_COMPONENT_LINE_THRESHOLD) {
        context.report({
          node: nameNode,
          message: `Component "${componentName}" is ${lineCount} lines - consider breaking it into smaller focused components`,
        });
      }
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        reportOversizedComponent(node.id, node.id.name, node);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        reportOversizedComponent(node.id, node.id.name, node.init);
      },
    };
  },
});
