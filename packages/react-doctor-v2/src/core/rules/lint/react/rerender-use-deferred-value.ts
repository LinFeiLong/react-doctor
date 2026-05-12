import { defineRule } from "../../registry.js";
import { isHookCall, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const EXPENSIVE_ARRAY_METHODS = new Set(["filter", "map", "flatMap", "sort", "toSorted", "reduce"]);
const interactiveNamePattern = /(?:query|search|input|filter|term|value)/i;

export const rerenderUseDeferredValue = defineRule<Rule>({
  recommendation:
    "Wrap interactive input used by expensive rendering work with useDeferredValue so typing and pointer input stay responsive.",
  examples: [
    {
      before: `const results = useMemo(() => search(items, query), [items, query]);`,
      after: `const deferredQuery = useDeferredValue(query);
const results = useMemo(() => search(items, deferredQuery), [items, deferredQuery]);`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, "useMemo")) return;
      const deps = node.arguments?.[1];
      if (!isNodeOfType(deps, "ArrayExpression")) return;
      const hasInteractiveDep = (deps.elements ?? []).some(
        (dependency: EsTreeNode | null) =>
          isNodeOfType(dependency, "Identifier") && interactiveNamePattern.test(dependency.name),
      );
      if (!hasInteractiveDep) return;
      const callback = node.arguments?.[0];
      const body = callback?.body;
      const expression = isNodeOfType(body, "BlockStatement") ? null : body;
      const isExpensiveArrayCall =
        isNodeOfType(expression, "CallExpression") &&
        isNodeOfType(expression.callee, "MemberExpression") &&
        isNodeOfType(expression.callee.property, "Identifier") &&
        EXPENSIVE_ARRAY_METHODS.has(expression.callee.property.name);
      if (!isExpensiveArrayCall) return;
      context.report({
        node,
        message:
          "expensive derived render depends on interactive input - wrap the input with useDeferredValue so typing stays responsive while the list recomputes",
      });
    },
  }),
});
