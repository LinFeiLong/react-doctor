import { defineRule } from "../../registry.js";
import {
  getImportSourceValue,
  getImportedName,
  getLocalName,
  getNamespaceImportName,
  isIdentifierCall,
  isNamespaceCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackAiNoManualSseResponse = defineRule<Rule>({
  recommendation:
    "Return toServerSentEventsResponse(stream) for TanStack AI SSE endpoints so headers, done markers, abort behavior, and error events stay consistent.",
  examples: [
    {
      before: `return new Response(toServerSentEventsStream(stream), { headers: { "Content-Type": "text/event-stream" } });`,
      after: `return toServerSentEventsResponse(stream);`,
    },
  ],
  create: (context: RuleContext) => {
    const sseStreamNames = new Set<string>();
    const sseStreamBindings = new Set<string>();
    const tanstackAiNamespaces = new Set<string>();

    return {
      ImportDeclaration(node: EsTreeNode) {
        if (getImportSourceValue(node) !== "@tanstack/ai") return;
        for (const specifier of node.specifiers ?? []) {
          const namespaceName = getNamespaceImportName(specifier);
          if (namespaceName) tanstackAiNamespaces.add(namespaceName);
          if (getImportedName(specifier) !== "toServerSentEventsStream") continue;
          const localName = getLocalName(specifier);
          if (localName) sseStreamNames.add(localName);
        }
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isNodeOfType(node.id, "Identifier")) return;
        if (
          !isIdentifierCall(node.init, sseStreamNames) &&
          !isNamespaceCall(node.init, tanstackAiNamespaces, "toServerSentEventsStream")
        )
          return;
        sseStreamBindings.add(node.id.name);
      },
      NewExpression(node: EsTreeNode) {
        if (!isNodeOfType(node.callee, "Identifier") || node.callee.name !== "Response") return;
        const body = node.arguments?.[0];
        const wrapsSseStreamCall =
          isIdentifierCall(body, sseStreamNames) ||
          isNamespaceCall(body, tanstackAiNamespaces, "toServerSentEventsStream");
        const wrapsSseStreamBinding =
          isNodeOfType(body, "Identifier") && sseStreamBindings.has(body.name);
        if (!wrapsSseStreamCall && !wrapsSseStreamBinding) return;
        context.report({
          node,
          message:
            "manual Response around toServerSentEventsStream - return toServerSentEventsResponse(stream) so TanStack AI owns SSE headers, completion, and errors",
        });
      },
    };
  },
});
