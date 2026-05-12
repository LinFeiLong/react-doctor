import { defineRule } from "../../registry.js";
import {
  BOOLEAN_PROP_PREFIX_PATTERN,
  BOOLEAN_PROP_THRESHOLD,
  collectBooleanLikePropsFromBody,
  isComponentAssignment,
  isComponentDeclaration,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noManyBooleanProps = defineRule<Rule>({
  recommendation:
    "Replace many boolean props with a variant enum, options object, or composed subcomponents to avoid invalid state combinations.",
  examples: [
    {
      before: `<Button primary danger loading />`,
      after: `<Button variant="danger" loading />`,
    },
  ],
  create: (context: RuleContext) => {
    const reportIfMany = (
      booleanLikePropNames: string[],
      componentName: string,
      reportNode: EsTreeNode,
    ): void => {
      if (booleanLikePropNames.length >= BOOLEAN_PROP_THRESHOLD) {
        context.report({
          node: reportNode,
          message: `Component "${componentName}" takes ${booleanLikePropNames.length} boolean-like props (${booleanLikePropNames.slice(0, 3).join(", ")}…) - consider compound components or explicit variants instead of stacking flags`,
        });
      }
    };

    const checkComponent = (
      param: EsTreeNode | undefined,
      body: EsTreeNode | undefined,
      componentName: string,
      reportNode: EsTreeNode,
    ): void => {
      if (!param) return;
      if (isNodeOfType(param, "ObjectPattern")) {
        const booleanLikePropNames: string[] = [];
        for (const property of param.properties ?? []) {
          if (!isNodeOfType(property, "Property")) continue;
          const keyName = isNodeOfType(property.key, "Identifier") ? property.key.name : null;
          if (!keyName) continue;
          if (BOOLEAN_PROP_PREFIX_PATTERN.test(keyName)) {
            booleanLikePropNames.push(keyName);
          }
        }
        reportIfMany(booleanLikePropNames, componentName, reportNode);
        return;
      }
      if (isNodeOfType(param, "Identifier")) {
        const accessed = collectBooleanLikePropsFromBody(body, param.name);
        reportIfMany([...accessed], componentName, reportNode);
      }
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!isComponentDeclaration(node)) return;
        checkComponent(node.params?.[0], node.body, node.id.name, node.id);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        checkComponent(node.init?.params?.[0], node.init?.body, node.id.name, node.id);
      },
    };
  },
});
