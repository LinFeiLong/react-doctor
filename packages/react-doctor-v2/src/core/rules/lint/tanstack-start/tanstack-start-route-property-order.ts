import { defineRule } from "../../registry.js";
import {
  TANSTACK_ROUTE_PROPERTY_ORDER,
  getPropertyKeyName,
  getRouteOptionsObject,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartRoutePropertyOrder = defineRule<Rule>({
  recommendation:
    "Order TanStack Start route properties consistently so loaders, validation, head, and component code are easy to scan.",
  examples: [
    {
      before: `export const Route = createFileRoute("/items")({ component: Items });`,
      after: `export const Route = createFileRoute("/items")({ loader, head, component: Items });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const optionsObject = getRouteOptionsObject(node);
      if (!optionsObject) return;

      const properties: EsTreeNode[] = optionsObject.properties ?? [];
      const orderedPropertyNames: string[] = [];
      for (const property of properties) {
        const propertyName = getPropertyKeyName(property);
        if (propertyName !== null) {
          orderedPropertyNames.push(propertyName);
        }
      }

      const sensitiveProperties = orderedPropertyNames.filter((propertyName) =>
        TANSTACK_ROUTE_PROPERTY_ORDER.includes(propertyName),
      );

      let lastIndex = -1;
      for (const propertyName of sensitiveProperties) {
        const currentIndex = TANSTACK_ROUTE_PROPERTY_ORDER.indexOf(propertyName);
        if (currentIndex < lastIndex) {
          const expectedBefore = TANSTACK_ROUTE_PROPERTY_ORDER[lastIndex];
          context.report({
            node: optionsObject,
            message: `Route property "${propertyName}" must come before "${expectedBefore}" - wrong order breaks TypeScript type inference`,
          });
          return;
        }
        lastIndex = currentIndex;
      }
    },
  }),
});
