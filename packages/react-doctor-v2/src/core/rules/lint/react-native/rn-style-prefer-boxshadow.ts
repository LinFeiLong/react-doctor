import { defineRule } from "../../registry.js";
import { findLegacyShadowProperty, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnStylePreferBoxShadow = defineRule<Rule>({
  recommendation:
    "Prefer the modern boxShadow style where supported and keep platform-specific shadow fallbacks isolated.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier")) return;
      const attributeName = node.name.name;
      if (attributeName !== "style" && !attributeName.endsWith("Style")) return;
      if (!isNodeOfType(node.value, "JSXExpressionContainer")) return;
      const expression = node.value.expression;
      if (!isNodeOfType(expression, "ObjectExpression")) return;
      const match = findLegacyShadowProperty(expression);
      if (!match) return;
      context.report({
        node: match.node,
        message: `${match.keyName} is iOS/Android-platform-specific - use the cross-platform CSS \`boxShadow\` string (e.g. \`boxShadow: "0 2px 8px rgba(0,0,0,0.1)"\`) on RN v7+`,
      });
    },
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;
      if (!isNodeOfType(node.callee.object, "Identifier")) return;
      if (node.callee.object.name !== "StyleSheet") return;
      if (!isNodeOfType(node.callee.property, "Identifier")) return;
      if (node.callee.property.name !== "create") return;
      const argument = node.arguments?.[0];
      if (!isNodeOfType(argument, "ObjectExpression")) return;
      for (const property of argument.properties ?? []) {
        if (!isNodeOfType(property, "Property")) continue;
        if (!isNodeOfType(property.value, "ObjectExpression")) continue;
        const match = findLegacyShadowProperty(property.value);
        if (!match) continue;
        context.report({
          node: match.node,
          message: `${match.keyName} is iOS/Android-platform-specific - use the cross-platform CSS \`boxShadow\` string on RN v7+`,
        });
      }
    },
  }),
});
