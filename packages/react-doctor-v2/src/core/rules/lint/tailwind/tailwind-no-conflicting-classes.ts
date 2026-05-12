import { defineRule } from "../../registry.js";
import { getClassNameLiteral, getTailwindTokenGroup, tokenizeClassName } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext, TailwindTokenGroup } from "./_utils.js";

const findConflictingToken = (classNameValue: string): TailwindTokenGroup | null => {
  const seenGroups = new Map<string, string>();
  for (const token of tokenizeClassName(classNameValue)) {
    const groupedToken = getTailwindTokenGroup(token);
    if (!groupedToken) continue;
    const previousToken = seenGroups.get(groupedToken.group);
    if (previousToken && previousToken !== groupedToken.token) return groupedToken;
    seenGroups.set(groupedToken.group, groupedToken.token);
  }
  return null;
};

export const tailwindNoConflictingClasses = defineRule<Rule>({
  recommendation:
    "Remove same-variant Tailwind utilities that fight for the same CSS property; keep the one intended final value instead of relying on class order.",
  examples: [
    {
      before: `<div className="flex grid p-2 p-4" />`,
      after: `<div className="grid p-4" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const classNameValue = getClassNameLiteral(node);
      if (!classNameValue) return;
      const conflictingToken = findConflictingToken(classNameValue);
      if (!conflictingToken) return;
      context.report({
        node,
        message: `Tailwind class "${conflictingToken.token}" conflicts with another ${conflictingToken.group} utility in the same className - remove the overridden class`,
      });
    },
  }),
});
