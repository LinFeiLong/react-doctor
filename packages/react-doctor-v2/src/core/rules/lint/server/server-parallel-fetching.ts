import { defineRule } from "../../registry.js";
import { APP_ROUTER_FILE_PATTERN, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const containsUppercaseJsxChild = (node: EsTreeNode): boolean => {
  let foundChild = false;
  const visit = (child: EsTreeNode): void => {
    if (foundChild) return;
    if (isNodeOfType(child, "JSXOpeningElement")) {
      const name = child.name;
      if (isNodeOfType(name, "JSXIdentifier") && /^[A-Z]/.test(name.name)) foundChild = true;
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
  return foundChild;
};

export const serverParallelFetching = defineRule<Rule>({
  recommendation:
    "Push data fetching into child Server Components or start promises before awaiting so sibling work can stream in parallel.",
  examples: [
    {
      before: `const user = await getUser();
return <Profile><Posts /></Profile>;`,
      after: `return <><User /><Suspense><Posts /></Suspense></>;`,
    },
  ],
  create: (context: RuleContext) => {
    const filename = context.getFilename?.() ?? "";
    return {
      ReturnStatement(node: EsTreeNode) {
        if (!APP_ROUTER_FILE_PATTERN.test(filename)) return;
        if (!node.argument || !containsUppercaseJsxChild(node.argument)) return;
        let parent = node.parent;
        while (
          parent &&
          !isNodeOfType(parent, "FunctionDeclaration") &&
          !isNodeOfType(parent, "ArrowFunctionExpression")
        ) {
          parent = parent.parent;
        }
        if (!parent?.body?.body) return;
        const hasAwaitBeforeReturn = parent.body.body.some(
          (statement: EsTreeNode) =>
            statement !== node &&
            isNodeOfType(statement, "VariableDeclaration") &&
            statement.declarations?.some((declarator: EsTreeNode) =>
              isNodeOfType(declarator.init, "AwaitExpression"),
            ),
        );
        if (!hasAwaitBeforeReturn) return;
        context.report({
          node,
          message:
            "Server Component awaits parent data before rendering child components - push data fetching into children or start promises before awaiting so sibling work can stream in parallel",
        });
      },
    };
  },
});
