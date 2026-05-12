import { defineRule } from "../../registry.js";
import {
  BORDER_SIDE_KEYS,
  BORDER_SIDE_WIDTH_KEYS,
  SIDE_TAB_BORDER_WIDTH_WITHOUT_RADIUS_PX,
  SIDE_TAB_BORDER_WIDTH_WITH_RADIUS_PX,
  SIDE_TAB_TAILWIND_WIDTH_WITHOUT_RADIUS,
  extractBorderColorFromShorthand,
  getInlineStyleExpression,
  getStringFromClassNameAttr,
  getStylePropertyKey,
  getStylePropertyNumberValue,
  getStylePropertyStringValue,
  isNeutralBorderColor,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noSideTabBorder = defineRule<Rule>({
  recommendation:
    "Use background, shadow, or active indicator treatments for side tabs instead of border tricks that shift layout or feel clipped.",
  examples: [
    {
      before: `<Tab className="border-l-4" />`,
      after: `<Tab className="bg-muted shadow-sm" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      const expression = getInlineStyleExpression(node);
      if (!expression) return;

      let hasBorderRadius = false;
      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (key === "borderRadius") {
          const numValue = getStylePropertyNumberValue(property);
          const strValue = getStylePropertyStringValue(property);
          if (
            (numValue !== null && numValue > 0) ||
            (strValue !== null && parseFloat(strValue) > 0)
          ) {
            hasBorderRadius = true;
          }
        }
      }

      const threshold = hasBorderRadius
        ? SIDE_TAB_BORDER_WIDTH_WITH_RADIUS_PX
        : SIDE_TAB_BORDER_WIDTH_WITHOUT_RADIUS_PX;

      for (const property of expression.properties ?? []) {
        const key = getStylePropertyKey(property);
        if (!key) continue;

        const sideLabel = BORDER_SIDE_KEYS.get(key);
        if (sideLabel !== undefined) {
          const value = getStylePropertyStringValue(property);
          if (!value) continue;
          const widthMatch = value.match(/^(\d+)px\s+solid/);
          if (!widthMatch) continue;

          const borderColor = extractBorderColorFromShorthand(value);
          if (borderColor && isNeutralBorderColor(borderColor)) continue;

          const width = parseInt(widthMatch[1], 10);
          if (width >= threshold) {
            context.report({
              node: property,
              message: `Thick one-sided border (${sideLabel}: ${width}px) - the most recognizable tell of AI-generated UIs. Use a subtler accent or remove it`,
            });
          }
        }

        if (BORDER_SIDE_WIDTH_KEYS.has(key)) {
          const numValue = getStylePropertyNumberValue(property);
          const strValue = getStylePropertyStringValue(property);
          const width = numValue ?? (strValue !== null ? parseFloat(strValue) : NaN);
          if (isNaN(width)) continue;

          const colorKey = key.replace("Width", "Color");
          const hasColoredBorder = expression.properties?.some((colorProperty: EsTreeNode) => {
            const colorPropertyKey = getStylePropertyKey(colorProperty);
            if (colorPropertyKey !== colorKey) return false;
            const colorValue = getStylePropertyStringValue(colorProperty);
            return colorValue !== null && !isNeutralBorderColor(colorValue);
          });
          if (!hasColoredBorder) continue;

          if (width >= threshold) {
            context.report({
              node: property,
              message: `Thick one-sided border (${width}px) - the most recognizable tell of AI-generated UIs. Use a subtler accent or remove it`,
            });
          }
        }
      }
    },
    JSXOpeningElement(node: EsTreeNode) {
      const classStr = getStringFromClassNameAttr(node);
      if (!classStr) return;

      const sideMatch = classStr.match(/\bborder-[lrse]-(\d+)\b/);
      if (!sideMatch) return;

      const hasNeutralBorderColor =
        /\bborder-(?:(?:gray|slate|zinc|neutral|stone)-\d+|white|black|transparent)\b/.test(
          classStr,
        );
      if (hasNeutralBorderColor) return;

      const width = parseInt(sideMatch[1], 10);
      const hasRounded =
        /\brounded(?:-(?!none\b)\w+)?\b/.test(classStr) && !/\brounded-none\b/.test(classStr);
      const tailwindThreshold = hasRounded
        ? SIDE_TAB_BORDER_WIDTH_WITH_RADIUS_PX
        : SIDE_TAB_TAILWIND_WIDTH_WITHOUT_RADIUS;

      if (width >= tailwindThreshold) {
        context.report({
          node,
          message: `Thick one-sided border (${sideMatch[0]}) - the most recognizable tell of AI-generated UIs. Use a subtler accent or remove it`,
        });
      }
    },
  }),
});
