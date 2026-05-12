import { defineRule } from "../../registry.js";
import { isComponentAssignment, isUppercaseName } from "../react/_utils.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const containsJsxSuspense = (node: EsTreeNode): boolean => {
  let foundSuspense = false;
  const visit = (child: EsTreeNode): void => {
    if (foundSuspense) return;
    if (isNodeOfType(child, "JSXOpeningElement")) {
      const name = child.name;
      if (isNodeOfType(name, "JSXIdentifier") && name.name === "Suspense") foundSuspense = true;
    }
    for (const key of Object.keys(child)) {
      if (key === "parent") continue;
      const value = child[key];
      if (Array.isArray(value)) {
        for (const item of value) if (item?.type) visit(item);
      } else if (value?.type) visit(value);
    }
  };
  visit(node);
  return foundSuspense;
};

export const asyncSuspenseBoundaries = defineRule<Rule>({
  recommendation:
    "Wrap slow async child regions in Suspense boundaries so React can stream available UI while slower data resolves.",
  examples: [
    {
      before: `<Page>{await SlowPanel()}</Page>`,
      after: `<Suspense fallback={<Spinner />}><SlowPanel /></Suspense>`,
    },
  ],
  create: (context: RuleContext) => {
    const checkAsyncComponent = (node: EsTreeNode, body: EsTreeNode | null | undefined): void => {
      if (!node.async || !body) return;
      if (containsJsxSuspense(body)) return;
      context.report({
        node,
        message:
          "async component renders without a Suspense boundary - wrap slower child regions in <Suspense> so React can stream available content",
      });
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        checkAsyncComponent(node, node.body);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        checkAsyncComponent(node.init, node.init?.body);
      },
    };
  },
});
