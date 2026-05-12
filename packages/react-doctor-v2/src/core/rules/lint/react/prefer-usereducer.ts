import { defineRule } from "../../registry.js";
import {
  RELATED_USE_STATE_THRESHOLD,
  isComponentAssignment,
  isHookCall,
  isUppercaseName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const preferUseReducer = defineRule<Rule>({
  recommendation:
    "Replace clusters of related useState setters with a reducer so transitions are explicit and multi-field updates happen together.",
  examples: [
    {
      before: `setFirstName(first);
setLastName(last);
setDirty(true);`,
      after: `dispatch({ type: "profileChanged", first, last });`,
    },
  ],
  create: (context: RuleContext) => {
    const reportExcessiveUseState = (body: EsTreeNode, componentName: string): void => {
      if (!isNodeOfType(body, "BlockStatement")) return;
      let useStateCount = 0;
      for (const statement of body.body ?? []) {
        if (!isNodeOfType(statement, "VariableDeclaration")) continue;
        for (const declarator of statement.declarations ?? []) {
          if (isHookCall(declarator.init, "useState")) useStateCount++;
        }
      }
      if (useStateCount >= RELATED_USE_STATE_THRESHOLD) {
        context.report({
          node: body,
          message: `Component "${componentName}" has ${useStateCount} useState calls - consider useReducer for related state`,
        });
      }
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        reportExcessiveUseState(node.body, node.id.name);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        reportExcessiveUseState(node.init.body, node.id.name);
      },
    };
  },
});
