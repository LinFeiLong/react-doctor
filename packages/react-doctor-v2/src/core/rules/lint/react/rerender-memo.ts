import { defineRule } from "../../registry.js";
import { callbackReturnsJsx, isHookCall } from "../performance/_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const rerenderMemo = defineRule<Rule>({
  recommendation:
    "Extract expensive JSX subtrees into memoized child components so parent renders and early returns can skip their work.",
  examples: [
    {
      before: `const rows = useMemo(() => <Rows items={items} />, [items]);`,
      after: `const MemoRows = memo(Rows);
<MemoRows items={items} />`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, "useMemo")) return;
      const callback = node.arguments?.[0];
      if (!callbackReturnsJsx(callback)) return;
      context.report({
        node,
        message:
          "useMemo returns JSX - extract the expensive subtree into a memoized child component so parent early returns and prop equality can skip the work",
      });
    },
  }),
});
