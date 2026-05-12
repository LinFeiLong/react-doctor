import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const expensiveComponentPattern =
  /(?:Editor|Chart|Canvas|Map|Table|Modal|Menu|Panel|Preview|Player)$/;

export const renderingActivity = defineRule<Rule>({
  recommendation:
    "Use React Activity or another preserve-state show/hide primitive for frequently toggled expensive UI instead of remounting it each time.",
  examples: [
    {
      before: `{open ? <HeavyPanel /> : null}`,
      after: `<Activity mode={open ? "visible" : "hidden"}><HeavyPanel /></Activity>`,
    },
  ],
  create: (context: RuleContext) => ({
    ConditionalExpression(node: EsTreeNode) {
      const consequent = node.consequent;
      if (!isNodeOfType(consequent, "JSXElement")) return;
      const name = consequent.openingElement?.name;
      if (!isNodeOfType(name, "JSXIdentifier")) return;
      if (!expensiveComponentPattern.test(name.name)) return;
      context.report({
        node: consequent,
        message: `<${name.name}> is conditionally mounted/unmounted - use React <Activity> for frequently toggled expensive UI so state and DOM can be preserved`,
      });
    },
  }),
});
