import { defineRule } from "../../registry.js";
import { TEST_OR_INFRA_FILE_PATTERN, isAddEventListenerCall, isNodeOfType } from "./utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "./utils/index.js";

export const clientEventListeners = defineRule<Rule>({
  recommendation:
    "Share global window/document listeners through one module-level subscription or a shared hook instead of adding one listener per component instance.",
  examples: [
    {
      before: `useEffect(() => window.addEventListener("resize", onResize), []);`,
      after: `subscribeToWindowResize(onResize);`,
    },
  ],
  create: (context: RuleContext) => {
    const filename = context.getFilename?.() ?? "";
    const isTestOrInfraFile = TEST_OR_INFRA_FILE_PATTERN.test(filename);

    return {
      CallExpression(node: EsTreeNode) {
        if (isTestOrInfraFile) return;
        if (!isAddEventListenerCall(node)) return;
        const eventTarget = node.callee?.object;
        if (!isNodeOfType(eventTarget, "Identifier")) return;
        if (eventTarget.name !== "window" && eventTarget.name !== "document") return;
        context.report({
          node,
          message:
            "global event listener is registered per component instance - share it through a module-level subscription or useSWRSubscription so N components don't add N listeners",
        });
      },
    };
  },
});
