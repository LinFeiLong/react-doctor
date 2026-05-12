import { defineRule } from "../../registry.js";
import {
  MOBX_REACT_IMPORT_SOURCES,
  getImportSourceValue,
  getImportedName,
  getLocalName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const isAnonymousComponent = (node: EsTreeNode | undefined): boolean =>
  (isNodeOfType(node, "ArrowFunctionExpression") || isNodeOfType(node, "FunctionExpression")) &&
  !node.id?.name;

export const mobxObserverNamedComponent = defineRule<Rule>({
  recommendation:
    "Pass a named function to MobX observer so React DevTools, stack traces, and hooks linting retain a real component boundary.",
  examples: [
    {
      before: `export const UserCard = observer(() => <div>{store.name}</div>);`,
      after: `export const UserCard = observer(function UserCard() { return <div>{store.name}</div>; });`,
    },
  ],
  create: (context: RuleContext) => {
    const observerNames = new Set<string>();

    return {
      ImportDeclaration(node: EsTreeNode) {
        if (!MOBX_REACT_IMPORT_SOURCES.has(getImportSourceValue(node) ?? "")) return;
        for (const specifier of node.specifiers ?? []) {
          if (getImportedName(specifier) !== "observer") continue;
          const localName = getLocalName(specifier);
          if (localName) observerNames.add(localName);
        }
      },
      CallExpression(node: EsTreeNode) {
        if (!isNodeOfType(node.callee, "Identifier") || !observerNames.has(node.callee.name))
          return;
        const componentArgument = node.arguments?.[0];
        if (!isAnonymousComponent(componentArgument)) return;
        context.report({
          node: componentArgument,
          message:
            "observer() wraps an anonymous component - use a named function so MobX components remain debuggable",
        });
      },
    };
  },
});
