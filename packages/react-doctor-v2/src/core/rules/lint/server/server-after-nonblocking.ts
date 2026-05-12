import { defineRule } from "../../registry.js";
import {
  hasDirective,
  hasUseServerDirective,
  isDeferrableSideEffectCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const serverAfterNonblocking = defineRule<Rule>({
  recommendation:
    "Move non-blocking work such as analytics, revalidation, and logging into after() so the response can finish first.",
  examples: [
    {
      before: `await analytics.track("signup");
return Response.json({ ok: true });`,
      after: `after(() => analytics.track("signup"));
return Response.json({ ok: true });`,
    },
  ],
  create: (context: RuleContext) => {
    let fileHasUseServerDirective = false;
    let serverFunctionDepth = 0;

    const enterIfServerFunction = (node: EsTreeNode): void => {
      if (hasUseServerDirective(node)) serverFunctionDepth++;
    };
    const leaveIfServerFunction = (node: EsTreeNode): void => {
      if (hasUseServerDirective(node)) serverFunctionDepth = Math.max(0, serverFunctionDepth - 1);
    };

    return {
      Program(programNode: EsTreeNode) {
        fileHasUseServerDirective = hasDirective(programNode, "use server");
      },
      FunctionDeclaration: enterIfServerFunction,
      "FunctionDeclaration:exit": leaveIfServerFunction,
      FunctionExpression: enterIfServerFunction,
      "FunctionExpression:exit": leaveIfServerFunction,
      ArrowFunctionExpression: enterIfServerFunction,
      "ArrowFunctionExpression:exit": leaveIfServerFunction,
      CallExpression(node: EsTreeNode) {
        if (!fileHasUseServerDirective && serverFunctionDepth === 0) return;
        if (!isNodeOfType(node.callee, "MemberExpression")) return;
        if (!isNodeOfType(node.callee.property, "Identifier")) return;

        const objectName = isNodeOfType(node.callee.object, "Identifier")
          ? node.callee.object.name
          : null;
        if (!objectName) return;

        const methodName = node.callee.property.name;
        if (!isDeferrableSideEffectCall(objectName, methodName)) return;

        context.report({
          node,
          message: `${objectName}.${methodName}() in server action - wrap in \`after(() => ${objectName}.${methodName}(...))\` so it doesn't delay the user-visible response`,
        });
      },
    };
  },
});
