import { defineRule } from "../../registry.js";
import {
  CHAT_LIFECYCLE_CALLBACKS,
  getImportSourceValue,
  getImportedName,
  getLocalName,
  getNamespaceImportName,
  getPropertyName,
  isIdentifierCall,
  isNamespaceCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackAiChatLifecycleMiddleware = defineRule<Rule>({
  recommendation:
    "Put TanStack AI chat lifecycle hooks inside the middleware array so terminal events, tool hooks, usage, and errors run through the supported middleware pipeline.",
  examples: [
    {
      before: `chat({ adapter, messages, onFinish: () => track() });`,
      after: `chat({ adapter, messages, middleware: [{ onFinish: () => track() }] });`,
    },
  ],
  create: (context: RuleContext) => {
    const chatNames = new Set<string>();
    const tanstackAiNamespaces = new Set<string>();

    return {
      ImportDeclaration(node: EsTreeNode) {
        if (getImportSourceValue(node) !== "@tanstack/ai") return;
        for (const specifier of node.specifiers ?? []) {
          const namespaceName = getNamespaceImportName(specifier);
          if (namespaceName) tanstackAiNamespaces.add(namespaceName);
          if (getImportedName(specifier) !== "chat") continue;
          const localName = getLocalName(specifier);
          if (localName) chatNames.add(localName);
        }
      },
      CallExpression(node: EsTreeNode) {
        if (
          !isIdentifierCall(node, chatNames) &&
          !isNamespaceCall(node, tanstackAiNamespaces, "chat")
        )
          return;
        const options = node.arguments?.[0];
        if (!isNodeOfType(options, "ObjectExpression")) return;
        for (const property of options.properties ?? []) {
          const propertyName = getPropertyName(property);
          if (!propertyName || !CHAT_LIFECYCLE_CALLBACKS.has(propertyName)) continue;
          context.report({
            node: property,
            message: `chat() lifecycle callback "${propertyName}" should be inside middleware: [{ ${propertyName}: ... }]`,
          });
        }
      },
    };
  },
});
