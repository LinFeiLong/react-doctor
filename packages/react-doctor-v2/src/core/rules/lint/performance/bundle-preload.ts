import { defineRule } from "../../registry.js";
import { walkAst, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const handlerAttributeNames = new Set(["onClick", "onSubmit"]);
const preloadAttributeNames = new Set(["onMouseEnter", "onPointerEnter", "onFocus"]);

const containsDynamicImport = (node: EsTreeNode): boolean => {
  let foundDynamicImport = false;
  walkAst(node, (child: EsTreeNode) => {
    if (foundDynamicImport) return false;
    if (isNodeOfType(child, "ImportExpression")) foundDynamicImport = true;
  });
  return foundDynamicImport;
};

export const bundlePreload = defineRule<Rule>({
  recommendation:
    "Preload dynamic imports on hover, focus, or another user-intent signal before the click or submit path needs the bundle.",
  examples: [
    {
      before: `<button onClick={() => import("./Chart")}>Open</button>`,
      after: `<button onMouseEnter={() => import("./Chart")} onClick={open}>Open</button>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const attributes = node.attributes ?? [];
      const hasPreloadHandler = attributes.some(
        (attribute: EsTreeNode) =>
          isNodeOfType(attribute, "JSXAttribute") &&
          isNodeOfType(attribute.name, "JSXIdentifier") &&
          preloadAttributeNames.has(attribute.name.name),
      );
      if (hasPreloadHandler) return;

      for (const attribute of attributes) {
        if (!isNodeOfType(attribute, "JSXAttribute")) continue;
        if (!isNodeOfType(attribute.name, "JSXIdentifier")) continue;
        if (!handlerAttributeNames.has(attribute.name.name)) continue;
        if (!isNodeOfType(attribute.value, "JSXExpressionContainer")) continue;
        const expression = attribute.value.expression;
        if (!expression || !containsDynamicImport(expression)) continue;
        context.report({
          node: attribute,
          message:
            "dynamic import starts only after activation - preload the bundle on hover/focus or another user-intent signal to reduce perceived latency",
        });
      }
    },
  }),
});
