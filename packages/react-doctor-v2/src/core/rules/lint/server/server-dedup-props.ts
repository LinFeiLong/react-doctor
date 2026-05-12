import { defineRule } from "../../registry.js";
import {
  DERIVING_ARRAY_METHODS,
  getDerivingMethodName,
  getRootIdentifierName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const serverDedupProps = defineRule<Rule>({
  recommendation:
    "Pass one source collection through the RSC boundary and derive sorted or filtered variants on the client when possible.",
  examples: [
    {
      before: `<Client items={items} sorted={items.toSorted(sortByName)} />`,
      after: `<Client items={items} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const identifierAttributes: Map<string, string> = new Map();
      const derivedAttributes: Array<{ propName: string; rootName: string; node: EsTreeNode }> = [];

      for (const attribute of node.attributes ?? []) {
        if (!isNodeOfType(attribute, "JSXAttribute")) continue;
        if (!isNodeOfType(attribute.name, "JSXIdentifier")) continue;
        if (!isNodeOfType(attribute.value, "JSXExpressionContainer")) continue;
        const expression = attribute.value.expression;
        if (!expression) continue;

        if (isNodeOfType(expression, "Identifier")) {
          identifierAttributes.set(expression.name, attribute.name.name);
        } else if (isNodeOfType(expression, "CallExpression")) {
          const derivingMethod = getDerivingMethodName(expression);
          if (!derivingMethod || !DERIVING_ARRAY_METHODS.has(derivingMethod)) continue;
          const root = getRootIdentifierName(expression, { followCallChains: true });
          if (!root) continue;
          derivedAttributes.push({
            propName: attribute.name.name,
            rootName: root,
            node: attribute,
          });
        }
      }

      for (const derivedAttribute of derivedAttributes) {
        const sourcePropName = identifierAttributes.get(derivedAttribute.rootName);
        if (sourcePropName) {
          context.report({
            node: derivedAttribute.node,
            message: `"${derivedAttribute.propName}" is derived from "${sourcePropName}" (same source: ${derivedAttribute.rootName}) - passing both doubles RSC serialization. Pass the source once and derive on the client`,
          });
        }
      }
    },
  }),
});
