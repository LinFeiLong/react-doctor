import { PAGES_DIRECTORY_PATTERN } from "../../constants/nextjs.js";
import { EFFECT_HOOK_NAMES } from "../../constants/react.js";
import { defineRule } from "../../utils/define-rule.js";
import { normalizeFilename } from "../../utils/normalize-filename.js";
import { getEffectCallback } from "../../utils/get-effect-callback.js";
import { isHookCall } from "../../utils/is-hook-call.js";
import { walkAst } from "../../utils/walk-ast.js";
import type { EsTreeNode } from "../../utils/es-tree-node.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";

const describeClientSideNavigation = (
  node: EsTreeNode,
  isPagesRouterFile: boolean,
): string | null => {
  const redirectGuidance = isPagesRouterFile
    ? "Use an event handler, a getServerSideProps redirect, or middleware instead."
    : "Use redirect() from next/navigation, or an event handler instead.";

  if (isNodeOfType(node, "CallExpression") && isNodeOfType(node.callee, "MemberExpression")) {
    const objectName = isNodeOfType(node.callee.object, "Identifier")
      ? node.callee.object.name
      : null;
    const methodName = isNodeOfType(node.callee.property, "Identifier")
      ? node.callee.property.name
      : null;
    if (objectName === "router" && (methodName === "push" || methodName === "replace")) {
      return `router.${methodName}() in useEffect flashes the wrong page before redirecting. ${redirectGuidance}`;
    }
  }

  if (isNodeOfType(node, "AssignmentExpression") && isNodeOfType(node.left, "MemberExpression")) {
    const objectName = isNodeOfType(node.left.object, "Identifier") ? node.left.object.name : null;
    const propertyName = isNodeOfType(node.left.property, "Identifier")
      ? node.left.property.name
      : null;
    if (objectName === "window" && propertyName === "location") {
      return `window.location assignment in useEffect flashes the wrong page before redirecting. ${redirectGuidance}`;
    }
    if (objectName === "location" && propertyName === "href") {
      return `location.href assignment in useEffect flashes the wrong page before redirecting. ${redirectGuidance}`;
    }
  }

  return null;
};

export const nextjsNoClientSideRedirect = defineRule<Rule>({
  id: "nextjs-no-client-side-redirect",
  title: "Client-side redirect for navigation",
  tags: ["test-noise"],
  requires: ["nextjs"],
  severity: "warn",
  recommendation:
    "Avoid redirects inside useEffect. Use an event handler, middleware, or server-side redirect (App Router: redirect() from next/navigation; Pages Router: getServerSideProps redirect)",
  create: (context: RuleContext) => {
    const filename = normalizeFilename(context.filename ?? "");
    const isPagesRouterFile = PAGES_DIRECTORY_PATTERN.test(filename);

    return {
      CallExpression(node: EsTreeNodeOfType<"CallExpression">) {
        if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
        const callback = getEffectCallback(node);
        if (!callback) return;

        walkAst(callback, (child: EsTreeNode) => {
          const navigationDescription = describeClientSideNavigation(child, isPagesRouterFile);
          if (navigationDescription) {
            context.report({
              node: child,
              message: navigationDescription,
            });
          }
        });
      },
    };
  },
});
