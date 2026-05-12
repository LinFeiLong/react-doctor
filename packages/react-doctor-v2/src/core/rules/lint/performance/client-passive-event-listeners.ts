import { defineRule } from "../../registry.js";
import { PASSIVE_EVENT_NAMES, isMemberProperty, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const clientPassiveEventListeners = defineRule<Rule>({
  recommendation:
    "Add passive: true to touch and wheel listeners that do not call preventDefault so scrolling can start immediately.",
  examples: [
    {
      before: `window.addEventListener("wheel", onWheel);`,
      after: `window.addEventListener("wheel", onWheel, { passive: true });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isMemberProperty(node.callee, "addEventListener")) return;
      if ((node.arguments?.length ?? 0) < 2) return;

      const eventNameNode = node.arguments[0];
      if (!isNodeOfType(eventNameNode, "Literal") || !PASSIVE_EVENT_NAMES.has(eventNameNode.value))
        return;

      const eventName = eventNameNode.value;
      const optionsArgument = node.arguments[2];

      if (!optionsArgument) {
        context.report({
          node,
          message: `"${eventName}" listener without { passive: true } - blocks scrolling performance. Only add { passive: true } if the handler does NOT call event.preventDefault() (passive listeners silently ignore preventDefault())`,
        });
        return;
      }

      if (!isNodeOfType(optionsArgument, "ObjectExpression")) return;

      const hasPassiveTrue = optionsArgument.properties?.some(
        (property: EsTreeNode) =>
          isNodeOfType(property, "Property") &&
          isNodeOfType(property.key, "Identifier") &&
          property.key.name === "passive" &&
          isNodeOfType(property.value, "Literal") &&
          property.value.value === true,
      );

      if (!hasPassiveTrue) {
        context.report({
          node,
          message: `"${eventName}" listener without { passive: true } - blocks scrolling performance. Only add { passive: true } if the handler does NOT call event.preventDefault() (passive listeners silently ignore preventDefault())`,
        });
      }
    },
  }),
});
