import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  TANSTACK_ROUTE_FILE_PATTERN,
  UPPERCASE_PATTERN,
  isHookCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartNoNavigateInRender = defineRule<Rule>({
  recommendation:
    "Navigate from event handlers, effects, loaders, or redirects instead of triggering navigation during render.",
  examples: [
    {
      before: `export const Route = createFileRoute("/items")({ component: Items });`,
      after: `export const Route = createFileRoute("/items")({ loader, head, component: Items });`,
    },
  ],
  create: (context: RuleContext) => {
    // HACK: only callbacks that React calls LATER are safe scopes for
    // navigate() - useEffect / useLayoutEffect (post-commit), useCallback
    // / useMemo (cached, fired by event handlers later), and JSX `onXxx`
    // attributes (event handlers). Synchronous-iteration callbacks like
    // `arr.forEach(item => navigate(item))` execute during render, so
    // they must NOT be treated as deferred - they're still render-time
    // side effects. A pure function-depth counter would skip them and
    // miss real bugs; the explicit allow-list is the correct boundary.
    let deferredCallbackDepth = 0;
    let eventHandlerDepth = 0;

    const isDeferredHookCall = (node: EsTreeNode): boolean =>
      isHookCall(node, EFFECT_HOOK_NAMES) ||
      isHookCall(node, "useCallback") ||
      isHookCall(node, "useMemo");

    const isEventHandlerAttribute = (node: EsTreeNode): boolean =>
      isNodeOfType(node.name, "JSXIdentifier") &&
      typeof node.name.name === "string" &&
      node.name.name.startsWith("on") &&
      UPPERCASE_PATTERN.test(node.name.name.charAt(2));

    return {
      CallExpression(node: EsTreeNode) {
        const filename = context.getFilename?.() ?? "";
        if (!TANSTACK_ROUTE_FILE_PATTERN.test(filename)) return;

        if (isDeferredHookCall(node)) deferredCallbackDepth++;

        if (deferredCallbackDepth > 0 || eventHandlerDepth > 0) return;

        if (
          isNodeOfType(node.callee, "Identifier") &&
          node.callee.name === "navigate" &&
          (node.arguments?.length ?? 0) > 0
        ) {
          context.report({
            node,
            message:
              "navigate() called during render - use redirect() in beforeLoad/loader for route-level redirects",
          });
        }
      },
      "CallExpression:exit"(node: EsTreeNode) {
        const filename = context.getFilename?.() ?? "";
        if (!TANSTACK_ROUTE_FILE_PATTERN.test(filename)) return;
        if (isDeferredHookCall(node)) {
          deferredCallbackDepth = Math.max(0, deferredCallbackDepth - 1);
        }
      },
      JSXAttribute(node: EsTreeNode) {
        const filename = context.getFilename?.() ?? "";
        if (!TANSTACK_ROUTE_FILE_PATTERN.test(filename)) return;
        if (isEventHandlerAttribute(node)) eventHandlerDepth++;
      },
      "JSXAttribute:exit"(node: EsTreeNode) {
        const filename = context.getFilename?.() ?? "";
        if (!TANSTACK_ROUTE_FILE_PATTERN.test(filename)) return;
        if (isEventHandlerAttribute(node)) {
          eventHandlerDepth = Math.max(0, eventHandlerDepth - 1);
        }
      },
    };
  },
});
