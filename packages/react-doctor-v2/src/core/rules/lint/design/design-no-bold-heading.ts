import { defineRule } from "../../registry.js";
import {
  HEADING_TAG_NAMES,
  HEAVY_HEADING_FONT_WEIGHT_MIN,
  HEAVY_HEADING_TAILWIND_WEIGHTS,
  findJsxAttribute,
  getClassNameLiteral,
  getInlineStyleObjectExpression,
  getOpeningElementTagName,
  getStylePropertyKeyName,
  getStylePropertyNumericValue,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noBoldHeading = defineRule<Rule>({
  recommendation:
    "Use medium or semibold heading weights instead of font-bold so display text keeps readable letter shapes.",
  examples: [
    {
      before: `<h1 className="font-bold" />`,
      after: `<h1 className="font-semibold" />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(openingNode: EsTreeNode) {
      const tagName = getOpeningElementTagName(openingNode);
      if (!tagName || !HEADING_TAG_NAMES.has(tagName)) return;

      const classAttribute = findJsxAttribute(openingNode.attributes ?? [], "className");
      if (classAttribute) {
        const classNameLiteral = getClassNameLiteral(classAttribute);
        if (classNameLiteral) {
          for (const tailwindWeightToken of HEAVY_HEADING_TAILWIND_WEIGHTS) {
            const tokenPattern = new RegExp(`(?:^|\\s)${tailwindWeightToken}(?:$|\\s|:)`);
            if (tokenPattern.test(classNameLiteral)) {
              context.report({
                node: classAttribute,
                message: `${tailwindWeightToken} on <${tagName}> crushes counter shapes at display sizes - use font-semibold (600) or font-medium (500)`,
              });
              return;
            }
          }
        }
      }

      const styleAttribute = findJsxAttribute(openingNode.attributes ?? [], "style");
      if (!styleAttribute) return;
      const styleObject = getInlineStyleObjectExpression(styleAttribute);
      if (!styleObject) return;

      for (const objectProperty of styleObject.properties ?? []) {
        const stylePropertyName = getStylePropertyKeyName(objectProperty);
        if (stylePropertyName !== "fontWeight") continue;
        const numericWeight = getStylePropertyNumericValue(objectProperty);
        if (numericWeight !== null && numericWeight >= HEAVY_HEADING_FONT_WEIGHT_MIN) {
          context.report({
            node: objectProperty,
            message: `fontWeight: ${numericWeight} on <${tagName}> crushes counter shapes at display sizes - use 500 or 600`,
          });
          return;
        }
      }
    },
  }),
});
