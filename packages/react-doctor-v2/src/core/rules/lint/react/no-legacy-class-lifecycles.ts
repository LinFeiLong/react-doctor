import { defineRule } from "../../registry.js";
import { buildLegacyLifecycleMessage, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noLegacyClassLifecycles = defineRule<Rule>({
  recommendation:
    "Replace unsafe class lifecycle methods with constructor initialization, componentDidMount/componentDidUpdate, getSnapshotBeforeUpdate, or function components.",
  examples: [
    {
      before: `componentWillMount() { load(); }`,
      after: `componentDidMount() { load(); }`,
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
      const message = buildLegacyLifecycleMessage(memberNode.key.name);
      if (message) context.report({ node: memberNode.key, message });
    };

    return {
      ClassBody(node: EsTreeNode) {
        for (const member of node.body ?? []) {
          checkMember(member);
        }
      },
    };
  },
});
