import { defineRule } from "../../registry.js";
import { isMemberProperty, reportLegacyShadowProperties, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnNoLegacyShadowStyles = defineRule<Rule>({
  recommendation:
    "Use boxShadow or platform-appropriate modern shadow APIs instead of legacy iOS-only shadow props.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "style") return;
      if (!isNodeOfType(node.value, "JSXExpressionContainer")) return;

      const expression = node.value.expression;

      if (isNodeOfType(expression, "ObjectExpression")) {
        reportLegacyShadowProperties(expression, context);
      } else if (isNodeOfType(expression, "ArrayExpression")) {
        for (const element of expression.elements ?? []) {
          if (isNodeOfType(element, "ObjectExpression")) {
            reportLegacyShadowProperties(element, context);
          }
        }
      }
    },
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;
      if (
        !isNodeOfType(node.callee.object, "Identifier") ||
        node.callee.object.name !== "StyleSheet"
      )
        return;
      if (!isMemberProperty(node.callee, "create")) return;

      const stylesArgument = node.arguments?.[0];
      if (!isNodeOfType(stylesArgument, "ObjectExpression")) return;

      for (const styleDefinition of stylesArgument.properties ?? []) {
        if (!isNodeOfType(styleDefinition, "Property")) continue;
        if (!isNodeOfType(styleDefinition.value, "ObjectExpression")) continue;
        reportLegacyShadowProperties(styleDefinition.value, context);
      }
    },
  }),
});
