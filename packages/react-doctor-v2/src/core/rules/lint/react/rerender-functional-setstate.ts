import { defineRule } from "../../registry.js";
import {
  STATE_ARITHMETIC_OPERATORS,
  deriveStateVariableName,
  isSetterCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rerenderFunctionalSetstate = defineRule<Rule>({
  recommendation:
    "Use functional setState when the next value depends on the previous value so callbacks can stay stable and avoid stale closures.",
  examples: [
    {
      before: `setCount(count + 1);`,
      after: `setCount((previousCount) => previousCount + 1);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isSetterCall(node)) return;
      if (!node.arguments?.length) return;

      const calleeName = node.callee.name;
      const argument = node.arguments[0];
      const expectedStateName = deriveStateVariableName(calleeName);

      if (
        isNodeOfType(argument, "BinaryExpression") &&
        STATE_ARITHMETIC_OPERATORS.has(argument.operator) &&
        expectedStateName
      ) {
        const matchesExpected = (operand: EsTreeNode | undefined): boolean =>
          isNodeOfType(operand, "Identifier") && operand.name === expectedStateName;

        const stateIdentifier = matchesExpected(argument.left)
          ? argument.left
          : matchesExpected(argument.right)
            ? argument.right
            : null;

        if (stateIdentifier) {
          context.report({
            node,
            message: `${calleeName}(${stateIdentifier.name} ${argument.operator} ...) - use functional update to avoid stale closures`,
          });
          return;
        }
      }

      if (
        isNodeOfType(argument, "UpdateExpression") &&
        (argument.operator === "++" || argument.operator === "--") &&
        isNodeOfType(argument.argument, "Identifier") &&
        argument.argument.name === expectedStateName
      ) {
        const display = argument.prefix
          ? `${argument.operator}${argument.argument.name}`
          : `${argument.argument.name}${argument.operator}`;
        context.report({
          node,
          message: `${calleeName}(${display}) - use functional update to avoid stale closures (and reading the post-increment value bug)`,
        });
        return;
      }

      // HACK: 'Removing Effect Dependencies' §"Are you reading some
      // state to calculate the next state?" - the array/object spread
      // shape is the most common stale-closure trap in
      // subscription-handler / setInterval callbacks:
      //
      //   setMessages([...messages, receivedMessage]);   // stale
      //   setMessages(msgs => [...msgs, receivedMessage]); // ok
      //
      // Detect when one of the spread sources structurally references
      // the derived state variable: `setX([...x, ...])` or
      // `setX({ ...x, key: value })`.
      if (expectedStateName && isNodeOfType(argument, "ArrayExpression")) {
        const spreadsState = (argument.elements ?? []).some(
          (element: EsTreeNode | null) =>
            isNodeOfType(element, "SpreadElement") &&
            isNodeOfType(element.argument, "Identifier") &&
            element.argument.name === expectedStateName,
        );
        if (spreadsState) {
          context.report({
            node,
            message: `${calleeName}([...${expectedStateName}, ...]) - use functional update \`${calleeName}(prev => [...prev, ...])\` to avoid stale closures`,
          });
          return;
        }
      }

      if (expectedStateName && isNodeOfType(argument, "ObjectExpression")) {
        const spreadsState = (argument.properties ?? []).some(
          (property: EsTreeNode | null) =>
            isNodeOfType(property, "SpreadElement") &&
            isNodeOfType(property.argument, "Identifier") &&
            property.argument.name === expectedStateName,
        );
        if (spreadsState) {
          context.report({
            node,
            message: `${calleeName}({ ...${expectedStateName}, ... }) - use functional update \`${calleeName}(prev => ({ ...prev, ... }))\` to avoid stale closures`,
          });
          return;
        }
      }
    },
  }),
});
