import { defineRule } from "../../registry.js";
import {
  PRESS_HANDLER_PROP_NAMES,
  handlerMutatesIdentifier,
  resolveJsxElementName,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rnPressableSharedValueMutation = defineRule<Rule>({
  recommendation:
    "Mutate Reanimated shared values from worklets or UI-thread handlers instead of React render or normal JS event paths.",
  examples: [
    {
      before: `<FlatList renderItem={({ item }) => <Row style={{ padding: 8 }} item={item} />} />`,
      after: `const renderItem = ({ item }) => <Row item={item} />;
<FlatList renderItem={renderItem} />`,
    },
  ],
  create: (context: RuleContext) => {
    const sharedValueBindingsByComponent: Array<Set<string>> = [];

    const enterScope = (): void => {
      sharedValueBindingsByComponent.push(new Set());
    };
    const exitScope = (): void => {
      sharedValueBindingsByComponent.pop();
    };
    const trackSharedValueBinding = (declarator: EsTreeNode): void => {
      if (sharedValueBindingsByComponent.length === 0) return;
      if (!isNodeOfType(declarator.id, "Identifier")) return;
      if (!isNodeOfType(declarator.init, "CallExpression")) return;
      const callee = declarator.init.callee;
      if (!isNodeOfType(callee, "Identifier")) return;
      if (callee.name !== "useSharedValue") return;
      sharedValueBindingsByComponent[sharedValueBindingsByComponent.length - 1].add(
        declarator.id.name,
      );
    };

    return {
      FunctionDeclaration: enterScope,
      "FunctionDeclaration:exit": exitScope,
      FunctionExpression: enterScope,
      "FunctionExpression:exit": exitScope,
      ArrowFunctionExpression: enterScope,
      "ArrowFunctionExpression:exit": exitScope,
      VariableDeclarator(node: EsTreeNode) {
        trackSharedValueBinding(node);
      },
      JSXOpeningElement(node: EsTreeNode) {
        const name = resolveJsxElementName(node);
        if (name !== "Pressable") return;
        if (sharedValueBindingsByComponent.length === 0) return;
        const activeBindings = new Set<string>();
        for (const frame of sharedValueBindingsByComponent) {
          for (const binding of frame) activeBindings.add(binding);
        }
        if (activeBindings.size === 0) return;

        for (const attribute of node.attributes ?? []) {
          if (!isNodeOfType(attribute, "JSXAttribute")) continue;
          if (!isNodeOfType(attribute.name, "JSXIdentifier")) continue;
          if (!PRESS_HANDLER_PROP_NAMES.has(attribute.name.name)) continue;
          if (!isNodeOfType(attribute.value, "JSXExpressionContainer")) continue;
          const handler = attribute.value.expression;
          if (!handler) continue;
          if (!handlerMutatesIdentifier(handler, activeBindings)) continue;

          context.report({
            node: attribute,
            message: `<Pressable> ${attribute.name.name} mutates a Reanimated shared value - use a Gesture.Tap() inside <GestureDetector> for press animations that stay on the UI thread`,
          });
        }
      },
    };
  },
});
