import { defineRule } from "../../registry.js";
import {
  LEGACY_CONTEXT_NAMES,
  buildLegacyContextMessage,
  isInsideClassBody,
  isUppercaseName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noLegacyContextApi = defineRule<Rule>({
  recommendation:
    "Migrate legacy contextTypes/getChildContext usage to createContext providers and useContext or use.",
  examples: [
    {
      before: `MyComponent.contextTypes = { theme: PropTypes.object };`,
      after: `const theme = useContext(ThemeContext);`,
    },
  ],
  create: (context: RuleContext) => {
    const checkMember = (memberNode: EsTreeNode | undefined): void => {
      if (!memberNode) return;
      if (
        !isNodeOfType(memberNode, "MethodDefinition") &&
        !isNodeOfType(memberNode, "PropertyDefinition")
      )
        return;
      if (!isNodeOfType(memberNode.key, "Identifier")) return;
      if (!LEGACY_CONTEXT_NAMES.has(memberNode.key.name)) return;
      context.report({
        node: memberNode.key,
        message: buildLegacyContextMessage(memberNode.key.name),
      });
    };

    return {
      ClassBody(node: EsTreeNode) {
        for (const member of node.body ?? []) {
          checkMember(member);
        }
      },
      AssignmentExpression(node: EsTreeNode) {
        if (node.operator !== "=") return;
        const left = node.left;
        if (!isNodeOfType(left, "MemberExpression")) return;
        if (left.computed) return;
        if (!isNodeOfType(left.property, "Identifier")) return;
        if (!LEGACY_CONTEXT_NAMES.has(left.property.name)) return;
        if (!isNodeOfType(left.object, "Identifier")) return;
        if (!isUppercaseName(left.object.name)) return;
        if (isInsideClassBody(node)) return;
        context.report({
          node: left,
          message: buildLegacyContextMessage(left.property.name),
        });
      },
    };
  },
});
