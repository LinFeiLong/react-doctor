import { defineRule } from "../../registry.js";
import { DERIVING_ARRAY_METHODS, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const isUppercaseJsxElement = (node: EsTreeNode): boolean => {
  const name = node.name;
  return Boolean(isNodeOfType(name, "JSXIdentifier") && /^[A-Z]/.test(name.name));
};

export const serverSerialization = defineRule<Rule>({
  recommendation:
    "Pass only the client props that are needed and derive secondary collections on the client to reduce RSC serialization payload.",
  examples: [
    {
      before: `<Client {...user} />`,
      after: `<Client id={user.id} name={user.name} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (!isUppercaseJsxElement(node)) return;
      for (const attribute of node.attributes ?? []) {
        if (isNodeOfType(attribute, "JSXSpreadAttribute")) {
          context.report({
            node: attribute,
            message:
              "spreading server data into a client boundary can serialize unused fields - pass only the primitive props the client component needs",
          });
          continue;
        }
        if (!isNodeOfType(attribute, "JSXAttribute")) continue;
        if (!isNodeOfType(attribute.value, "JSXExpressionContainer")) continue;
        const expression = attribute.value.expression;
        if (!isNodeOfType(expression, "CallExpression")) continue;
        if (!isNodeOfType(expression.callee, "MemberExpression")) continue;
        if (!isNodeOfType(expression.callee.property, "Identifier")) continue;
        if (!DERIVING_ARRAY_METHODS.has(expression.callee.property.name)) continue;
        context.report({
          node: attribute,
          message:
            "derived collection is serialized as a separate client prop - pass the source data once and derive on the client to reduce RSC payload size",
        });
      }
    },
  }),
});
