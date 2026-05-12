import { defineRule } from "../../registry.js";
import { STORY_FILE_PATTERN, isUserEventCall, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const isAwaited = (node: EsTreeNode): boolean => isNodeOfType(node.parent, "AwaitExpression");

export const storybookAwaitPlayInteractions = defineRule<Rule>({
  recommendation:
    "Await userEvent calls inside Storybook play functions so interaction tests and snapshots observe the settled UI.",
  examples: [
    {
      before: `export const Filled = { play: async () => { userEvent.click(button); } };`,
      after: `export const Filled = { play: async () => { await userEvent.click(button); } };`,
    },
  ],
  create: (context: RuleContext) => {
    const filename = context.getFilename?.() ?? "";
    const isStoryFile = STORY_FILE_PATTERN.test(filename);
    let playFunctionDepth = 0;

    return {
      Property(node: EsTreeNode) {
        if (!isStoryFile) return;
        const keyName = isNodeOfType(node.key, "Identifier") ? node.key.name : null;
        if (keyName !== "play") return;
        const value = node.value;
        if (
          !isNodeOfType(value, "ArrowFunctionExpression") &&
          !isNodeOfType(value, "FunctionExpression")
        )
          return;
        playFunctionDepth++;
      },
      "Property:exit"(node: EsTreeNode) {
        if (!isStoryFile) return;
        const keyName = isNodeOfType(node.key, "Identifier") ? node.key.name : null;
        if (keyName === "play" && playFunctionDepth > 0) playFunctionDepth--;
      },
      CallExpression(node: EsTreeNode) {
        if (!isStoryFile || playFunctionDepth === 0) return;
        if (!isUserEventCall(node) || isAwaited(node)) return;
        context.report({
          node,
          message:
            "Storybook play userEvent call is not awaited - await the interaction before assertions or snapshots",
        });
      },
    };
  },
});
