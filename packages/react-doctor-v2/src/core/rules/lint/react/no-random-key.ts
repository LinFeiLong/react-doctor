import { defineRule } from "../../registry.js";
import { walkAst, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const getDirectUnstableKeySource = (node: EsTreeNode): string | null => {
  if (
    isNodeOfType(node, "CallExpression") &&
    isNodeOfType(node.callee, "Identifier") &&
    (node.callee.name === "Date" ||
      node.callee.name === "randomUUID" ||
      node.callee.name === "uuid" ||
      node.callee.name === "nanoid")
  ) {
    return `${node.callee.name}()`;
  }
  if (
    isNodeOfType(node, "CallExpression") &&
    isNodeOfType(node.callee, "MemberExpression") &&
    isNodeOfType(node.callee.object, "Identifier") &&
    isNodeOfType(node.callee.property, "Identifier")
  ) {
    const receiverName = node.callee.object.name;
    const methodName = node.callee.property.name;
    if (receiverName === "Math" && methodName === "random") return "Math.random()";
    if (receiverName === "Date" && methodName === "now") return "Date.now()";
    if (receiverName === "crypto" && methodName === "randomUUID") return "crypto.randomUUID()";
  }
  if (
    isNodeOfType(node, "NewExpression") &&
    isNodeOfType(node.callee, "Identifier") &&
    node.callee.name === "Date"
  ) {
    return "new Date()";
  }
  return null;
};

const getUnstableKeySource = (node: EsTreeNode | undefined): string | null => {
  if (!node) return null;
  let source: string | null = null;
  walkAst(node, (child) => {
    if (source) return false;
    source = getDirectUnstableKeySource(child);
    if (source) return false;
  });
  return source;
};

export const noRandomKey = defineRule<Rule>({
  recommendation:
    "Use a stable identifier from the data model for React keys; random or time-based keys force remounts and hide the state bug instead of fixing identity.",
  examples: [
    {
      before: `{items.map((item) => <Row key={Math.random()} item={item} />)}`,
      after: `{items.map((item) => <Row key={item.id} item={item} />)}`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier") || node.name.name !== "key") return;
      if (!isNodeOfType(node.value, "JSXExpressionContainer")) return;
      const source = getUnstableKeySource(node.value.expression);
      if (!source) return;
      context.report({
        node,
        message: `${source} used as a React key - use a stable item id so React can preserve child state`,
      });
    },
  }),
});
