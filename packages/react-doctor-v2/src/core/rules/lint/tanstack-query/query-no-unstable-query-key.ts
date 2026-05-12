import { defineRule } from "../../registry.js";
import {
  QUERY_KEY_PROPERTY_NAMES,
  TANSTACK_QUERY_HOOKS,
  containsUnstableQueryKeyValue,
  getObjectProperty,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const queryNoUnstableQueryKey = defineRule<Rule>({
  recommendation:
    "Keep TanStack Query keys deterministic and serializable; put changing inputs in stable primitives and never use time, random values, or functions in queryKey.",
  examples: [
    {
      before: `useQuery({ queryKey: ["todos", Date.now()], queryFn });`,
      after: `useQuery({ queryKey: ["todos", userId], queryFn });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const calleeName = isNodeOfType(node.callee, "Identifier") ? node.callee.name : null;
      if (!calleeName || !TANSTACK_QUERY_HOOKS.has(calleeName)) return;
      const optionsArgument = node.arguments?.[0];
      if (!isNodeOfType(optionsArgument, "ObjectExpression")) return;
      for (const propertyName of QUERY_KEY_PROPERTY_NAMES) {
        const keyProperty = getObjectProperty(optionsArgument, propertyName);
        if (!keyProperty) continue;
        const unstableSource = containsUnstableQueryKeyValue(keyProperty?.value);
        if (!unstableSource) continue;
        context.report({
          node: keyProperty,
          message: `${propertyName} contains ${unstableSource} - query keys must be deterministic so cache identity stays stable`,
        });
      }
    },
  }),
});
