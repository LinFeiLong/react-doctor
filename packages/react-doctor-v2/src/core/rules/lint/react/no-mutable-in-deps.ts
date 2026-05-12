import { defineRule } from "../../registry.js";
import {
  HOOKS_WITH_DEPS,
  collectUseRefBindingNames,
  findMutableDepIssue,
  isComponentAssignment,
  isHookCall,
  isUppercaseName,
  walkAst,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noMutableInDeps = defineRule<Rule>({
  recommendation:
    "Replace mutable dependency values with stable primitives, refs, reducers, or memoized immutable values before putting them in a hook dependency array.",
  examples: [
    {
      before: `const options = new Map();
useEffect(sync, [options]);`,
      after: `const options = useMemo(() => new Map(), []);
useEffect(sync, [options]);`,
    },
  ],
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || !isNodeOfType(componentBody, "BlockStatement")) return;
      const useRefBindingNames = collectUseRefBindingNames(componentBody);

      walkAst(componentBody, (child: EsTreeNode) => {
        if (!isNodeOfType(child, "CallExpression")) return;
        if (!isHookCall(child, HOOKS_WITH_DEPS)) return;
        if ((child.arguments?.length ?? 0) < 2) return;
        const depsNode = child.arguments[1];
        if (!isNodeOfType(depsNode, "ArrayExpression")) return;

        for (const element of depsNode.elements ?? []) {
          if (!element) continue;
          const issue = findMutableDepIssue(element, useRefBindingNames);
          if (!issue) continue;
          if (issue.kind === "ref-current") {
            context.report({
              node: element,
              message: `"${issue.rootName}.current" in deps - refs are mutable and don't trigger re-renders, so React won't re-run this effect when it changes. Read the ref inside the effect body instead`,
            });
          } else {
            context.report({
              node: element,
              message: `Mutable global "${issue.rootName}.*" in deps - values like \`location.pathname\` can change without triggering a re-render, so they can't drive effect re-runs. Subscribe with useSyncExternalStore or read inside the effect`,
            });
          }
        }
      });
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        checkComponent(node.body);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        checkComponent(node.init?.body);
      },
    };
  },
});
