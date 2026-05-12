import { defineRule } from "../../registry.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnAnimationReactionAsDerived = defineRule<Rule>({
  recommendation:
    "Use derived shared values for pure derivations and reserve animated reactions for side effects.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "Identifier") || node.callee.name !== "useAnimatedReaction")
        return;
      const reactionFn = node.arguments?.[1];
      if (!reactionFn) return;
      if (
        !isNodeOfType(reactionFn, "ArrowFunctionExpression") &&
        !isNodeOfType(reactionFn, "FunctionExpression")
      ) {
        return;
      }

      const body = reactionFn.body;

      // We only fire when the reaction body is EXACTLY one statement
      // and that statement is an assignment to another shared value's
      // `.value`. Any additional statement (console.log, function call,
      // condition, runOnJS, etc.) means useAnimatedReaction's
      // side-effect semantics are wanted; useDerivedValue would change
      // behavior.
      let singleAssignment: EsTreeNode | null = null;
      if (isNodeOfType(body, "BlockStatement")) {
        const statements = body.body ?? [];
        if (statements.length !== 1) return;
        const onlyStatement = statements[0];
        if (!isNodeOfType(onlyStatement, "ExpressionStatement")) return;
        singleAssignment = onlyStatement.expression;
      } else if (body) {
        // Concise arrow body like `(cur) => sv.value = cur`.
        singleAssignment = body;
      }
      if (!singleAssignment) return;
      if (!isNodeOfType(singleAssignment, "AssignmentExpression")) return;
      if (!isNodeOfType(singleAssignment.left, "MemberExpression")) return;
      if (!isNodeOfType(singleAssignment.left.property, "Identifier")) return;
      if (singleAssignment.left.property.name !== "value") return;

      context.report({
        node,
        message:
          "useAnimatedReaction body is a single shared-value assignment - useDerivedValue is shorter and tracks dependencies natively",
      });
    },
  }),
});
