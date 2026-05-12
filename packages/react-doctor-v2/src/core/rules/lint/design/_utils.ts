import {
  BOUNCE_ANIMATION_NAMES,
  COLOR_CHROMA_THRESHOLD,
  DARK_GLOW_BLUR_THRESHOLD_PX,
  DARK_BACKGROUND_CHANNEL_MAX,
  TAILWIND_DEFAULT_PALETTE_NAMES,
  TAILWIND_DEFAULT_PALETTE_STOPS,
  TAILWIND_PALETTE_UTILITY_PREFIXES,
  ELLIPSIS_EXCLUDED_TAG_NAMES,
} from "../constants.js";
import { findJsxAttribute, isNodeOfType } from "../utils.js";
import type { ParsedRgb, EsTreeNode } from "../utils.js";

export const BORDER_SIDE_KEYS = new Map<string, string>([
  ["borderLeft", "left"],
  ["borderRight", "right"],
  ["borderInlineStart", "left"],
  ["borderInlineEnd", "right"],
]);

export const BORDER_SIDE_WIDTH_KEYS = new Set([
  "borderLeftWidth",
  "borderRightWidth",
  "borderInlineStartWidth",
  "borderInlineEndWidth",
]);

export const extractBorderColorFromShorthand = (shorthandValue: string): string | null => {
  const afterSolid = shorthandValue.match(/solid\s+(.+)$/i);
  if (!afterSolid) return null;
  return afterSolid[1].trim();
};

export const parseColorToRgb = (value: string): ParsedRgb | null => {
  const trimmed = value.trim().toLowerCase();

  const hex8Match = trimmed.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})[0-9a-f]{2}$/);
  if (hex8Match) {
    return {
      red: parseInt(hex8Match[1], 16),
      green: parseInt(hex8Match[2], 16),
      blue: parseInt(hex8Match[3], 16),
    };
  }

  const hex6Match = trimmed.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
  if (hex6Match) {
    return {
      red: parseInt(hex6Match[1], 16),
      green: parseInt(hex6Match[2], 16),
      blue: parseInt(hex6Match[3], 16),
    };
  }

  const hex4Match = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])[0-9a-f]$/);
  if (hex4Match) {
    return {
      red: parseInt(hex4Match[1] + hex4Match[1], 16),
      green: parseInt(hex4Match[2] + hex4Match[2], 16),
      blue: parseInt(hex4Match[3] + hex4Match[3], 16),
    };
  }

  const hex3Match = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (hex3Match) {
    return {
      red: parseInt(hex3Match[1] + hex3Match[1], 16),
      green: parseInt(hex3Match[2] + hex3Match[2], 16),
      blue: parseInt(hex3Match[3] + hex3Match[3], 16),
    };
  }

  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      red: parseInt(rgbMatch[1], 10),
      green: parseInt(rgbMatch[2], 10),
      blue: parseInt(rgbMatch[3], 10),
    };
  }

  return null;
};

export const extractColorFromShadowLayer = (layer: string): ParsedRgb | null => {
  const rgbMatch = layer.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      red: parseInt(rgbMatch[1], 10),
      green: parseInt(rgbMatch[2], 10),
      blue: parseInt(rgbMatch[3], 10),
    };
  }

  const hexMatch = layer.match(/#([0-9a-f]{3,6})\b/i);
  if (hexMatch) return parseColorToRgb(`#${hexMatch[1]}`);

  return null;
};

export const getInlineStyleExpression = (node: EsTreeNode): EsTreeNode | null => {
  if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "style") return null;
  if (!isNodeOfType(node.value, "JSXExpressionContainer")) return null;
  const expression = node.value.expression;
  if (!isNodeOfType(expression, "ObjectExpression")) return null;
  return expression;
};

export const getStringFromClassNameAttr = (node: EsTreeNode): string | null => {
  const classAttr = findJsxAttribute(node.attributes ?? [], "className");
  if (!classAttr?.value) return null;
  if (isNodeOfType(classAttr.value, "Literal") && typeof classAttr.value.value === "string") {
    return classAttr.value.value;
  }
  if (
    isNodeOfType(classAttr.value, "JSXExpressionContainer") &&
    isNodeOfType(classAttr.value.expression, "Literal") &&
    typeof classAttr.value.expression.value === "string"
  ) {
    return classAttr.value.expression.value;
  }
  if (
    isNodeOfType(classAttr.value, "JSXExpressionContainer") &&
    isNodeOfType(classAttr.value.expression, "TemplateLiteral") &&
    classAttr.value.expression.quasis?.length === 1
  ) {
    return classAttr.value.expression.quasis[0].value?.raw ?? null;
  }
  return null;
};

export const getStylePropertyKey = (property: EsTreeNode): string | null => {
  if (!isNodeOfType(property, "Property")) return null;
  if (isNodeOfType(property.key, "Identifier")) return property.key.name;
  if (isNodeOfType(property.key, "Literal") && typeof property.key.value === "string")
    return property.key.value;
  return null;
};

export const getStylePropertyNumberValue = (property: EsTreeNode): number | null => {
  if (isNodeOfType(property.value, "Literal") && typeof property.value.value === "number") {
    return property.value.value;
  }
  if (
    isNodeOfType(property.value, "UnaryExpression") &&
    property.value.operator === "-" &&
    isNodeOfType(property.value.argument, "Literal") &&
    typeof property.value.argument.value === "number"
  ) {
    return -property.value.argument.value;
  }
  return null;
};

export const getStylePropertyStringValue = (property: EsTreeNode): string | null => {
  if (isNodeOfType(property.value, "Literal") && typeof property.value.value === "string") {
    return property.value.value;
  }
  return null;
};

export const hasBounceAnimationName = (value: string): boolean => {
  const lowerValue = value.toLowerCase();
  for (const name of BOUNCE_ANIMATION_NAMES) {
    if (lowerValue.includes(name)) return true;
  }
  return false;
};

export const hasColorChroma = (parsed: ParsedRgb): boolean =>
  Math.max(parsed.red, parsed.green, parsed.blue) -
    Math.min(parsed.red, parsed.green, parsed.blue) >=
  COLOR_CHROMA_THRESHOLD;

export const parseShadowLayerBlur = (layer: string): number => {
  const withoutColors = layer.replace(/rgba?\([^)]*\)/g, "").replace(/#[0-9a-f]{3,8}\b/gi, "");
  const numericTokens = [...withoutColors.matchAll(/(\d+(?:\.\d+)?)(px)?/g)].map((match) =>
    parseFloat(match[1]),
  );
  return numericTokens.length >= 3 ? numericTokens[2] : 0;
};

export const splitShadowLayers = (shadowValue: string): string[] =>
  shadowValue.split(/,(?![^(]*\))/);

export const hasColoredGlowShadow = (shadowValue: string): boolean => {
  for (const layer of splitShadowLayers(shadowValue)) {
    const color = extractColorFromShadowLayer(layer);
    if (
      color &&
      hasColorChroma(color) &&
      parseShadowLayerBlur(layer) > DARK_GLOW_BLUR_THRESHOLD_PX
    ) {
      return true;
    }
  }
  return false;
};

export const isPureBlackColor = (value: string): boolean => {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "#000" || trimmed === "#000000") return true;
  if (/^rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(trimmed)) return true;
  return false;
};

export const isBackgroundDark = (bgValue: string): boolean => {
  const trimmed = bgValue.trim().toLowerCase();
  if (isPureBlackColor(trimmed)) return true;

  const parsed = parseColorToRgb(trimmed);
  if (!parsed) return false;

  return (
    parsed.red <= DARK_BACKGROUND_CHANNEL_MAX &&
    parsed.green <= DARK_BACKGROUND_CHANNEL_MAX &&
    parsed.blue <= DARK_BACKGROUND_CHANNEL_MAX
  );
};

// HACK: Map (not plain object) so the `key in BORDER_SIDE_KEYS` guard
// below doesn't accept inherited Object.prototype names. Without this,
// any inline style object whose key happens to be `constructor` /
// `toString` / `hasOwnProperty` / `__proto__` would pass the membership
// check and fall through to a garbage report message that reads off
// `BORDER_SIDE_KEYS["constructor"]` (= the native Object function).

export const isNeutralBorderColor = (value: string): boolean => {
  const trimmed = value.trim().toLowerCase();
  if (["gray", "grey", "silver", "white", "black", "transparent", "currentcolor"].includes(trimmed))
    return true;

  const parsed = parseColorToRgb(trimmed);
  if (parsed) return !hasColorChroma(parsed);

  return false;
};

export const isOvershootCubicBezier = (value: string): boolean => {
  const match = value.match(
    /cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/,
  );
  if (!match) return false;
  const controlY1 = parseFloat(match[2]);
  const controlY2 = parseFloat(match[4]);
  return controlY1 < -0.1 || controlY1 > 1.1 || controlY2 < -0.1 || controlY2 > 1.1;
};

export const buildDefaultPaletteRegex = (): RegExp => {
  const utilityPrefixGroup = TAILWIND_PALETTE_UTILITY_PREFIXES.join("|");
  const paletteNameGroup = TAILWIND_DEFAULT_PALETTE_NAMES.join("|");
  // HACK: anchor the numeric group to the actual Tailwind palette stops
  // rather than `\d{2,3}`. Custom Tailwind themes that re-purpose the
  // utility prefix for a non-Tailwind scale (e.g. Radix Colors uses
  // `gray.1` … `gray.12`) would otherwise false-positive on `text-gray-11`,
  // `fill-gray-12`, etc. - those aren't the Tailwind template default.
  const paletteStopGroup = TAILWIND_DEFAULT_PALETTE_STOPS.join("|");
  // HACK: /g so we can iterate every default-palette token in one
  // className. Without /g the user fixes one token, re-runs, sees the
  // next, fixes that, re-runs… N round-trips for N tokens in a single
  // attribute.
  return new RegExp(
    `(?:^|\\s|:)(${utilityPrefixGroup})-(${paletteNameGroup})-(${paletteStopGroup})(?=$|[\\s:/])`,
    "g",
  );
};

export const DEFAULT_PALETTE_REGEX = buildDefaultPaletteRegex();

export const collectAxisShorthandPairs = (
  classNameValue: string,
  horizontalPattern: RegExp,
  verticalPattern: RegExp,
): Array<{ value: string }> => {
  const horizontalValues = new Set<string>();
  for (const horizontalMatch of classNameValue.matchAll(horizontalPattern)) {
    horizontalValues.add(`${horizontalMatch[1]}${horizontalMatch[2]}`);
  }
  const matchedPairs: Array<{ value: string }> = [];
  for (const verticalMatch of classNameValue.matchAll(verticalPattern)) {
    const verticalValue = `${verticalMatch[1]}${verticalMatch[2]}`;
    if (horizontalValues.has(verticalValue)) {
      matchedPairs.push({ value: verticalValue });
    }
  }
  return matchedPairs;
};

export const collectJsxLabelText = (jsxElementNode: EsTreeNode): string | null => {
  const childList = jsxElementNode.children ?? [];
  if (childList.length === 0) return null;
  const collectedFragments: string[] = [];
  for (const childNode of childList) {
    if (isNodeOfType(childNode, "JSXText")) {
      collectedFragments.push(typeof childNode.value === "string" ? childNode.value : "");
      continue;
    }
    if (isNodeOfType(childNode, "JSXExpressionContainer")) {
      const expression = childNode.expression;
      if (isNodeOfType(expression, "Literal") && typeof expression.value === "string") {
        collectedFragments.push(expression.value);
        continue;
      }
      if (isNodeOfType(expression, "TemplateLiteral") && expression.quasis?.length === 1) {
        const rawTemplate = expression.quasis[0].value?.raw;
        if (typeof rawTemplate === "string" && expression.expressions.length === 0) {
          collectedFragments.push(rawTemplate);
          continue;
        }
      }
      // Bail on dynamic content (interpolation, identifiers).
      return null;
    }
    if (isNodeOfType(childNode, "JSXFragment")) {
      // Recurse into <>…</> fragments - they're transparent for label purposes.
      const fragmentLabel = collectJsxLabelText(childNode);
      if (fragmentLabel === null) return null;
      collectedFragments.push(fragmentLabel);
      continue;
    }
    if (isNodeOfType(childNode, "JSXElement")) {
      // Bail on nested elements (icons, spans) - the leading/trailing text alone isn't the full label.
      return null;
    }
  }
  return collectedFragments.join("").trim();
};

export const getClassNameLiteral = (classAttribute: EsTreeNode): string | null => {
  if (!classAttribute.value) return null;
  if (
    isNodeOfType(classAttribute.value, "Literal") &&
    typeof classAttribute.value.value === "string"
  ) {
    return classAttribute.value.value;
  }
  if (isNodeOfType(classAttribute.value, "JSXExpressionContainer")) {
    const expression = classAttribute.value.expression;
    if (isNodeOfType(expression, "Literal") && typeof expression.value === "string") {
      return expression.value;
    }
    if (isNodeOfType(expression, "TemplateLiteral") && expression.quasis?.length === 1) {
      return expression.quasis[0].value?.raw ?? null;
    }
  }
  return null;
};

export const getInlineStyleObjectExpression = (jsxAttribute: EsTreeNode): EsTreeNode | null => {
  if (!isNodeOfType(jsxAttribute.name, "JSXIdentifier") || jsxAttribute.name.name !== "style") {
    return null;
  }
  if (!isNodeOfType(jsxAttribute.value, "JSXExpressionContainer")) return null;
  const expression = jsxAttribute.value.expression;
  if (!isNodeOfType(expression, "ObjectExpression")) return null;
  return expression;
};

export const getOpeningElementTagName = (
  openingElement: EsTreeNode | null | undefined,
): string | null => {
  if (!openingElement) return null;
  if (isNodeOfType(openingElement.name, "JSXIdentifier")) return openingElement.name.name;
  if (isNodeOfType(openingElement.name, "JSXMemberExpression")) {
    let cursor: EsTreeNode = openingElement.name;
    while (isNodeOfType(cursor, "JSXMemberExpression")) {
      cursor = cursor.property;
    }
    if (isNodeOfType(cursor, "JSXIdentifier")) return cursor.name;
  }
  return null;
};

export const getStylePropertyKeyName = (objectProperty: EsTreeNode): string | null => {
  if (!isNodeOfType(objectProperty, "Property")) return null;
  if (isNodeOfType(objectProperty.key, "Identifier")) return objectProperty.key.name;
  if (isNodeOfType(objectProperty.key, "Literal") && typeof objectProperty.key.value === "string") {
    return objectProperty.key.value;
  }
  return null;
};

export const getStylePropertyNumericValue = (objectProperty: EsTreeNode): number | null => {
  const valueNode = objectProperty.value;
  if (!valueNode) return null;
  if (isNodeOfType(valueNode, "Literal") && typeof valueNode.value === "number")
    return valueNode.value;
  if (isNodeOfType(valueNode, "Literal") && typeof valueNode.value === "string") {
    const parsed = parseFloat(valueNode.value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const hasResponsivePrefix = (classNameValue: string, axisPrefix: string): boolean =>
  new RegExp(`(?:^|\\s)\\w+:${axisPrefix}-`).test(classNameValue);

export const isButtonLikeTagName = (tagName: string): boolean => {
  if (tagName === "button") return true;
  if (tagName === "Button") return true;
  return false;
};

export const isInsideExcludedAncestor = (jsxTextNode: EsTreeNode): boolean => {
  let cursor = jsxTextNode.parent;
  while (cursor) {
    if (isNodeOfType(cursor, "JSXElement")) {
      const tagName = getOpeningElementTagName(cursor.openingElement);
      if (tagName && ELLIPSIS_EXCLUDED_TAG_NAMES.has(tagName.toLowerCase())) return true;
      const translateAttribute = findJsxAttribute(
        cursor.openingElement?.attributes ?? [],
        "translate",
      );
      if (
        isNodeOfType(translateAttribute?.value, "Literal") &&
        translateAttribute.value.value === "no"
      ) {
        return true;
      }
    }
    cursor = cursor.parent;
  }
  return false;
};

export const tokenizeClassName = (classNameValue: string): string[] =>
  classNameValue.split(/\s+/).filter(Boolean);

export {
  INLINE_STYLE_PROPERTY_THRESHOLD,
  LONG_TRANSITION_DURATION_THRESHOLD_MS,
  SIDE_TAB_BORDER_WIDTH_WITH_RADIUS_PX,
  SIDE_TAB_BORDER_WIDTH_WITHOUT_RADIUS_PX,
  SIDE_TAB_TAILWIND_WIDTH_WITHOUT_RADIUS,
  TINY_TEXT_THRESHOLD_PX,
  WIDE_TRACKING_THRESHOLD_EM,
  Z_INDEX_ABSURD_THRESHOLD,
  EM_DASH_CHARACTER,
  FLEX_OR_GRID_DISPLAY_TOKENS,
  HEADING_TAG_NAMES,
  HEAVY_HEADING_FONT_WEIGHT_MIN,
  HEAVY_HEADING_TAILWIND_WEIGHTS,
  PADDING_HORIZONTAL_AXIS_PATTERN,
  PADDING_VERTICAL_AXIS_PATTERN,
  SIZE_HEIGHT_AXIS_PATTERN,
  SIZE_WIDTH_AXIS_PATTERN,
  SPACE_AXIS_PATTERN,
  TRAILING_THREE_PERIOD_ELLIPSIS_PATTERN,
  VAGUE_BUTTON_LABELS,
} from "../constants.js";
export { findJsxAttribute, walkAst, isNodeOfType } from "../utils.js";
export type { EsTreeNode, RuleContext, Rule } from "../utils.js";
