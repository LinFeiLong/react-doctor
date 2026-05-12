import { defineRule } from "../../registry.js";
import {
  MUTATING_ARRAY_METHODS,
  collectUseStateBindings,
  getRootIdentifierName,
  isComponentAssignment,
  isUppercaseName,
  walkComponentRespectingShadows,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noDirectStateMutation = defineRule<Rule>({
  recommendation:
    "Create a new object or array when updating state and pass it to the setter instead of mutating the existing state reference.",
  examples: [
    {
      before: `items.push(next);
setItems(items);`,
      after: `setItems([...items, next]);`,
    },
  ],
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || !isNodeOfType(componentBody, "BlockStatement")) return;
      const bindings = collectUseStateBindings(componentBody);
      if (bindings.length === 0) return;

      const stateValueToSetter = new Map<string, string>();
      for (const binding of bindings) {
        stateValueToSetter.set(binding.valueName, binding.setterName);
      }

      walkComponentRespectingShadows(
        componentBody,
        new Set(),
        (child: EsTreeNode, currentlyShadowed: ReadonlySet<string>) => {
          if (isNodeOfType(child, "AssignmentExpression")) {
            if (!isNodeOfType(child.left, "MemberExpression")) return;
            const rootName = getRootIdentifierName(child.left);
            if (!rootName || !stateValueToSetter.has(rootName)) return;
            if (currentlyShadowed.has(rootName)) return;
            const setterName = stateValueToSetter.get(rootName);
            context.report({
              node: child,
              message: `Direct property assignment on useState value "${rootName}" - call ${setterName} with a new value; React only re-renders on a new reference`,
            });
            return;
          }

          if (isNodeOfType(child, "CallExpression")) {
            const callee = child.callee;
            if (!isNodeOfType(callee, "MemberExpression")) return;
            if (!isNodeOfType(callee.property, "Identifier")) return;
            const methodName = callee.property.name;
            if (!MUTATING_ARRAY_METHODS.has(methodName)) return;
            const rootName = getRootIdentifierName(callee.object);
            if (!rootName || !stateValueToSetter.has(rootName)) return;
            if (currentlyShadowed.has(rootName)) return;
            const setterName = stateValueToSetter.get(rootName);
            context.report({
              node: child,
              message: `In-place mutation of useState value "${rootName}" via .${methodName}() - call ${setterName} with a new array; React only re-renders on a new reference`,
            });
          }
        },
      );
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        checkComponent(node.body);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        checkComponent(node.init?.body);
      },
    };
  },
});
