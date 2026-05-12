import { defineRule } from "../../registry.js";
import {
  DUPLICATE_STORAGE_READ_THRESHOLD,
  STORAGE_OBJECTS,
  isMemberProperty,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const jsCacheStorage = defineRule<Rule>({
  recommendation:
    "Read localStorage or sessionStorage once and reuse the value instead of performing repeated synchronous storage reads.",
  examples: [
    {
      before: `const theme = localStorage.getItem("theme");
const mode = localStorage.getItem("theme");`,
      after: `const theme = localStorage.getItem("theme");`,
    },
  ],
  create: (context: RuleContext) => {
    const storageReadCounts = new Map<string, number>();

    return {
      CallExpression(node: EsTreeNode) {
        if (!isMemberProperty(node.callee, "getItem")) return;
        const storageObject = node.callee.object;
        if (
          !isNodeOfType(storageObject, "Identifier") ||
          !STORAGE_OBJECTS.has(storageObject.name)
        ) {
          return;
        }
        const storageKeyArgument = node.arguments?.[0];
        if (!isNodeOfType(storageKeyArgument, "Literal")) return;

        const storageKey = String(storageKeyArgument.value);
        const readCount = (storageReadCounts.get(storageKey) ?? 0) + 1;
        storageReadCounts.set(storageKey, readCount);

        if (readCount === DUPLICATE_STORAGE_READ_THRESHOLD) {
          context.report({
            node,
            message: `${storageObject.name}.getItem("${storageKey}") called multiple times - cache the result in a variable`,
          });
        }
      },
    };
  },
});
