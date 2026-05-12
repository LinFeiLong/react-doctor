import { defineRule } from "../../registry.js";
import {
  FLEX_OR_GRID_DISPLAY_TOKENS,
  SPACE_AXIS_PATTERN,
  getClassNameLiteral,
  tokenizeClassName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noSpaceOnFlexChildren = defineRule<Rule>({
  recommendation:
    "Use gap on the flex container instead of spacing margins on individual flex children.",
  examples: [
    {
      before: `<div className="flex"><span className="mr-2" /><span /></div>`,
      after: `<div className="flex gap-2"><span /><span /></div>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(jsxAttribute: EsTreeNode) {
      if (
        !isNodeOfType(jsxAttribute.name, "JSXIdentifier") ||
        jsxAttribute.name.name !== "className"
      ) {
        return;
      }
      const classNameLiteral = getClassNameLiteral(jsxAttribute);
      if (!classNameLiteral) return;
      const tokens = tokenizeClassName(classNameLiteral);
      let hasFlexOrGridLayout = false;
      for (const token of tokens) {
        // Strip Tailwind variant prefixes (`md:flex`, `dark:hover:grid`).
        const lastSegment = token.includes(":") ? token.slice(token.lastIndexOf(":") + 1) : token;
        if (FLEX_OR_GRID_DISPLAY_TOKENS.has(lastSegment)) {
          hasFlexOrGridLayout = true;
          break;
        }
      }
      if (!hasFlexOrGridLayout) return;
      const spaceMatch = classNameLiteral.match(SPACE_AXIS_PATTERN);
      if (!spaceMatch) return;
      // HACK: preserve the axis in the suggestion - `space-x-4` maps
      // to `gap-x-4` (horizontal only). A bare `gap-4` would also add
      // vertical gap, silently changing layout for the developer who
      // followed the hint.
      const spaceAxis = spaceMatch[1];
      const spaceValue = spaceMatch[2];
      context.report({
        node: jsxAttribute,
        message: `space-${spaceAxis}-${spaceValue} on a flex/grid parent - use gap-${spaceAxis}-${spaceValue} instead. Per-sibling margins phantom-gap on conditional render and don't mirror in RTL`,
      });
    },
  }),
});
