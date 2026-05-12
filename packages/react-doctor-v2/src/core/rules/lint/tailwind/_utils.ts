import { findJsxAttribute, isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

export interface TailwindTokenGroup {
  token: string;
  group: string;
}

const DISPLAY_TOKENS = new Set([
  "block",
  "contents",
  "flex",
  "flow-root",
  "grid",
  "hidden",
  "inline",
  "inline-block",
  "inline-flex",
  "inline-grid",
]);

const POSITION_TOKENS = new Set(["absolute", "fixed", "relative", "static", "sticky"]);

const TEXT_SIZE_TOKENS = new Set([
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
  "text-4xl",
  "text-5xl",
  "text-6xl",
  "text-7xl",
  "text-8xl",
  "text-9xl",
]);

export const getClassNameLiteral = (openingElement: EsTreeNode): string | null => {
  const className = findJsxAttribute(openingElement.attributes ?? [], "className");
  if (!className?.value) return null;
  if (isNodeOfType(className.value, "Literal") && typeof className.value.value === "string") {
    return className.value.value;
  }
  if (!isNodeOfType(className.value, "JSXExpressionContainer")) return null;
  const expression = className.value.expression;
  if (isNodeOfType(expression, "Literal") && typeof expression.value === "string")
    return expression.value;
  if (isNodeOfType(expression, "TemplateLiteral") && expression.quasis?.length === 1) {
    return expression.quasis[0].value?.raw ?? null;
  }
  return null;
};

export const getLiteralString = (node: EsTreeNode): string | null => {
  if (isNodeOfType(node, "Literal") && typeof node.value === "string") return node.value;
  if (isNodeOfType(node, "TemplateLiteral") && node.quasis?.length === 1) {
    return node.quasis[0].value?.raw ?? null;
  }
  return null;
};

export const tokenizeClassName = (classNameValue: string): string[] =>
  classNameValue.split(/\s+/).filter(Boolean);

const splitVariant = (token: string): { variant: string; baseToken: string } => {
  const separatorIndex = token.lastIndexOf(":");
  if (separatorIndex === -1) return { variant: "", baseToken: token };
  return {
    variant: token.slice(0, separatorIndex + 1),
    baseToken: token.slice(separatorIndex + 1),
  };
};

const getSpacingGroup = (baseToken: string): string | null => {
  const match = baseToken.match(/^-?(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml)-/);
  return match ? match[1] : null;
};

const getSizeGroup = (baseToken: string): string | null => {
  const match = baseToken.match(/^(w|h|min-w|min-h|max-w|max-h)-/);
  return match ? match[1] : null;
};

const getOverflowGroup = (baseToken: string): string | null => {
  const match = baseToken.match(/^(overflow|overflow-x|overflow-y)-/);
  return match ? match[1] : null;
};

export const getTailwindTokenGroup = (token: string): TailwindTokenGroup | null => {
  const { variant, baseToken } = splitVariant(token);
  const spacingGroup = getSpacingGroup(baseToken);
  if (spacingGroup) return { token, group: `${variant}${spacingGroup}` };
  const sizeGroup = getSizeGroup(baseToken);
  if (sizeGroup) return { token, group: `${variant}${sizeGroup}` };
  const overflowGroup = getOverflowGroup(baseToken);
  if (overflowGroup) return { token, group: `${variant}${overflowGroup}` };
  if (DISPLAY_TOKENS.has(baseToken)) return { token, group: `${variant}display` };
  if (POSITION_TOKENS.has(baseToken)) return { token, group: `${variant}position` };
  if (TEXT_SIZE_TOKENS.has(baseToken) || /^text-\[[^\]]+\]$/.test(baseToken)) {
    return { token, group: `${variant}text-size` };
  }
  if (/^bg-(?!opacity-)/.test(baseToken)) return { token, group: `${variant}background` };
  if (/^z-/.test(baseToken)) return { token, group: `${variant}z-index` };
  return null;
};

export { findJsxAttribute };
export type { EsTreeNode, Rule, RuleContext };
export { isNodeOfType } from "../utils.js";
