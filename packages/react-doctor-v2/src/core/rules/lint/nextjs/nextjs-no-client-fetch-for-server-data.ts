import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  PAGES_DIRECTORY_PATTERN,
  PAGE_OR_LAYOUT_FILE_PATTERN,
  containsFetchCall,
  getEffectCallback,
  hasDirective,
  isHookCall,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsNoClientFetchForServerData = defineRule<Rule>({
  recommendation:
    "Fetch server-owned data in Server Components or route loaders instead of fetching it from Client Component effects.",
  examples: [
    {
      before: `"use client";
useEffect(() => fetch("/api/posts"), []);`,
      after: `const posts = await getPosts();
<ClientPosts posts={posts} />`,
    },
  ],
  create: (context: RuleContext) => {
    let fileHasUseClient = false;

    return {
      Program(programNode: EsTreeNode) {
        fileHasUseClient = hasDirective(programNode, "use client");
      },
      CallExpression(node: EsTreeNode) {
        if (!fileHasUseClient || !isHookCall(node, EFFECT_HOOK_NAMES)) return;

        const callback = getEffectCallback(node);
        if (!callback || !containsFetchCall(callback)) return;

        const filename = context.getFilename?.() ?? "";
        const isPageOrLayoutFile =
          PAGE_OR_LAYOUT_FILE_PATTERN.test(filename) || PAGES_DIRECTORY_PATTERN.test(filename);

        if (isPageOrLayoutFile) {
          context.report({
            node,
            message:
              "useEffect + fetch in a page/layout - fetch data server-side with a server component instead",
          });
        }
      },
    };
  },
});
