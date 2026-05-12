import { defineRule } from "../../registry.js";
import {
  getImportSourceValue,
  getImportedName,
  getLocalName,
  getNamespaceImportName,
  getObjectProperty,
  getPropertyName,
  isIdentifierCall,
  isNamespaceCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackAiOutputSchema = defineRule<Rule>({
  recommendation:
    "Use chat({ outputSchema }) with the project's schema library; do not hand-wire provider-specific responseFormat or pass raw JSON Schema objects.",
  examples: [
    {
      before: `chat({ adapter, messages, modelOptions: { responseFormat: { type: "json_schema" } } });`,
      after: `chat({ adapter, messages, outputSchema: z.object({ name: z.string() }) });`,
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

        const outputSchema = getObjectProperty(options, "outputSchema");
        if (outputSchema && isNodeOfType(outputSchema.value, "ObjectExpression")) {
          context.report({
            node: outputSchema,
            message:
              "raw object passed to outputSchema - use a runtime schema library such as Zod, ArkType, or Valibot for validation and inference",
          });
        }

        const modelOptions = getObjectProperty(options, "modelOptions");
        if (!modelOptions || !isNodeOfType(modelOptions.value, "ObjectExpression")) return;
        for (const property of modelOptions.value.properties ?? []) {
          if (getPropertyName(property) !== "responseFormat") continue;
          context.report({
            node: property,
            message:
              "provider-specific responseFormat in modelOptions bypasses TanStack AI structured output handling - pass outputSchema to chat() instead",
          });
        }
      },
    };
  },
});
