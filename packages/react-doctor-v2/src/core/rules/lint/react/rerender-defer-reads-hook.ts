import { defineRule } from "../../registry.js";
import {
  collectHandlerBindingNames,
  findHookCallBindings,
  isComponentAssignment,
  isInsideEventHandler,
  isUppercaseName,
  walkAst,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rerenderDeferReadsHook = defineRule<Rule>({
  recommendation:
    "Defer dynamic reads such as search params or storage until the callback that needs them so the component does not subscribe to every change.",
  examples: [
    {
      before: `const params = useSearchParams();
const onClick = () => track(params.get("ref"));`,
      after: `const onClick = () => track(new URLSearchParams(window.location.search).get("ref"));`,
    },
  ],
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || !isNodeOfType(componentBody, "BlockStatement")) return;
      const bindings = findHookCallBindings(componentBody);
      if (bindings.length === 0) return;
      const handlerBindingNames = collectHandlerBindingNames(componentBody);

      for (const binding of bindings) {
        const referenceLocations: EsTreeNode[] = [];
        walkAst(componentBody, (child: EsTreeNode) => {
          if (child === binding.declarator.id) return;
          if (isNodeOfType(child, "Identifier") && child.name === binding.valueName) {
            referenceLocations.push(child);
          }
        });

        if (referenceLocations.length === 0) continue;

        const allInHandlers = referenceLocations.every((ref) =>
          isInsideEventHandler(ref, handlerBindingNames),
        );
        if (!allInHandlers) continue;

        context.report({
          node: binding.declarator,
          message: `${binding.hookName}() return is only read inside event handlers - defer the read into the handler (e.g. \`new URL(window.location.href).searchParams\`) so the component doesn't re-render on every URL change`,
        });
      }
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
