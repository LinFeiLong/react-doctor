import { defineRule } from "../../registry.js";
import {
  HOOK_OBJECTS_WITH_METHODS,
  buildHookBindingMap,
  isComponentAssignment,
  isUppercaseName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const reactCompilerDestructureMethod = defineRule<Rule>({
  recommendation:
    "Destructure only the methods needed from hook return objects so React Compiler and dependency analysis can see the stable values.",
  examples: [
    {
      before: `const router = useRouter();
router.push("/");`,
      after: `const { push } = useRouter();
push("/");`,
    },
  ],
  create: (context: RuleContext) => {
    const hookBindingMapStack: Array<Map<string, string>> = [];

    const isComponent = (node: EsTreeNode): boolean => {
      if (isNodeOfType(node, "FunctionDeclaration")) {
        return Boolean(node.id?.name && isUppercaseName(node.id.name));
      }
      if (isNodeOfType(node, "VariableDeclarator")) {
        return isComponentAssignment(node);
      }
      return false;
    };

    // HACK: push UNCONDITIONALLY for every component so push/pop stay
    // balanced. A concise-arrow component (`const Foo = () => <div />`)
    // has no BlockStatement body and therefore no hook bindings, but it
    // still triggers the matching `:exit` - without an unconditional
    // push, the exit would pop the *outer* component's frame and silently
    // drop diagnostics on every member access in the parent. The empty
    // Map returned by `buildHookBindingMap` for non-Block bodies is the
    // correct semantic for "this component declares zero hook bindings".
    const enter = (node: EsTreeNode): void => {
      if (!isComponent(node)) return;
      const body = isNodeOfType(node, "FunctionDeclaration") ? node.body : node.init?.body;
      hookBindingMapStack.push(buildHookBindingMap(body));
    };
    const exit = (node: EsTreeNode): void => {
      if (isComponent(node)) hookBindingMapStack.pop();
    };

    return {
      FunctionDeclaration: enter,
      "FunctionDeclaration:exit": exit,
      VariableDeclarator: enter,
      "VariableDeclarator:exit": exit,
      MemberExpression(node: EsTreeNode) {
        if (hookBindingMapStack.length === 0) return;
        if (node.computed) return;
        if (!isNodeOfType(node.object, "Identifier")) return;
        if (!isNodeOfType(node.property, "Identifier")) return;

        const bindingName = node.object.name;
        const methodName = node.property.name;
        const hookBindings = hookBindingMapStack[hookBindingMapStack.length - 1];
        const hookSource = hookBindings.get(bindingName);
        if (!hookSource) return;

        const allowedMethods = HOOK_OBJECTS_WITH_METHODS.get(hookSource);
        if (!allowedMethods || !allowedMethods.has(methodName)) return;

        if (!isNodeOfType(node.parent, "CallExpression") || node.parent.callee !== node) return;

        context.report({
          node,
          message: `Destructure for clarity: \`const { ${methodName} } = ${hookSource}()\` then call \`${methodName}(...)\` directly - easier for React Compiler to memoize and clearer about which methods this component depends on`,
        });
      },
    };
  },
});
