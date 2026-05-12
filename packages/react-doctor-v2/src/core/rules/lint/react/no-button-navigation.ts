import { defineRule } from "../../registry.js";
import { findJsxAttribute, getRootIdentifierName, walkAst, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const BUTTON_LIKE_COMPONENT_PATTERN = /Button$/;
const ROUTER_NAVIGATION_METHOD_NAMES = new Set(["navigate", "push", "replace"]);

const getJsxElementName = (node: EsTreeNode): string | null => {
  if (isNodeOfType(node.name, "JSXIdentifier")) return node.name.name;
  if (
    isNodeOfType(node.name, "JSXMemberExpression") &&
    isNodeOfType(node.name.property, "JSXIdentifier")
  ) {
    return node.name.property.name;
  }
  return null;
};

const isButtonLikeElement = (node: EsTreeNode): boolean => {
  const elementName = getJsxElementName(node);
  return (
    elementName === "button" ||
    Boolean(elementName && BUTTON_LIKE_COMPONENT_PATTERN.test(elementName))
  );
};

const hasLinkRenderingEscape = (node: EsTreeNode): boolean => {
  if (getJsxElementName(node) === "button") return false;
  const asChild = findJsxAttribute(node.attributes ?? [], "asChild");
  if (asChild && !asChild.value) return true;
  if (isNodeOfType(asChild?.value, "JSXExpressionContainer")) {
    const expression = asChild.value.expression;
    if (isNodeOfType(expression, "Literal") && expression.value === true) return true;
  }
  const asAttribute =
    findJsxAttribute(node.attributes ?? [], "as") ??
    findJsxAttribute(node.attributes ?? [], "component");
  if (isNodeOfType(asAttribute?.value, "Literal")) {
    const value = String(asAttribute.value.value ?? "");
    return value === "a" || value === "Link" || value === "NavLink";
  }
  const expression = isNodeOfType(asAttribute?.value, "JSXExpressionContainer")
    ? asAttribute.value.expression
    : null;
  return (
    isNodeOfType(expression, "Identifier") &&
    (expression.name === "Link" || expression.name === "NavLink")
  );
};

const isRouterNavigationCall = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node, "CallExpression") || !isNodeOfType(node.callee, "MemberExpression"))
    return false;
  if (!isNodeOfType(node.callee.property, "Identifier")) return false;
  const methodName = node.callee.property.name;
  if (!ROUTER_NAVIGATION_METHOD_NAMES.has(methodName)) return false;
  const receiverName = getRootIdentifierName(node.callee.object);
  return (
    receiverName === "router" ||
    receiverName === "navigation" ||
    receiverName === "history" ||
    receiverName === "window"
  );
};

const isLocationNavigationCall = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node, "CallExpression") || !isNodeOfType(node.callee, "MemberExpression"))
    return false;
  if (!isNodeOfType(node.callee.property, "Identifier")) return false;
  if (node.callee.property.name !== "assign" && node.callee.property.name !== "replace")
    return false;
  const receiver = node.callee.object;
  if (isNodeOfType(receiver, "Identifier") && receiver.name === "location") return true;
  return (
    isNodeOfType(receiver, "MemberExpression") &&
    isNodeOfType(receiver.object, "Identifier") &&
    receiver.object.name === "window" &&
    isNodeOfType(receiver.property, "Identifier") &&
    receiver.property.name === "location"
  );
};

const isWindowLocationAssignment = (node: EsTreeNode): boolean =>
  isNodeOfType(node, "AssignmentExpression") &&
  ((isNodeOfType(node.left, "MemberExpression") &&
    isNodeOfType(node.left.object, "Identifier") &&
    node.left.object.name === "location") ||
    (isNodeOfType(node.left, "MemberExpression") &&
      isNodeOfType(node.left.object, "MemberExpression") &&
      isNodeOfType(node.left.object.object, "Identifier") &&
      node.left.object.object.name === "window" &&
      isNodeOfType(node.left.object.property, "Identifier") &&
      node.left.object.property.name === "location") ||
    (isNodeOfType(node.left, "MemberExpression") &&
      isNodeOfType(node.left.object, "Identifier") &&
      node.left.object.name === "window" &&
      isNodeOfType(node.left.property, "Identifier") &&
      node.left.property.name === "location"));

const containsNavigation = (node: EsTreeNode | undefined): boolean => {
  if (!node) return false;
  let didFindNavigation = false;
  walkAst(node, (child) => {
    if (didFindNavigation) return false;
    if (
      isRouterNavigationCall(child) ||
      isLocationNavigationCall(child) ||
      isWindowLocationAssignment(child)
    ) {
      didFindNavigation = true;
      return false;
    }
  });
  return didFindNavigation;
};

export const noButtonNavigation = defineRule<Rule>({
  recommendation:
    "Render navigation as a real link or framework Link so users keep open-in-new-tab, previews, history, and accessibility semantics; do not make the lint green by adding ARIA to a button.",
  examples: [
    {
      before: `<button onClick={() => router.push("/settings")}>Settings</button>`,
      after: `<Link href="/settings">Settings</Link>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      if (!isButtonLikeElement(node)) return;
      if (hasLinkRenderingEscape(node)) return;
      const onClick = findJsxAttribute(node.attributes ?? [], "onClick");
      if (!isNodeOfType(onClick?.value, "JSXExpressionContainer")) return;
      if (!containsNavigation(onClick.value.expression)) return;
      context.report({
        node,
        message:
          "button onClick performs navigation - use a real link or framework Link so browser navigation affordances keep working",
      });
    },
  }),
});
