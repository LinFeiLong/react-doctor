import { defineRule } from "../../registry.js";
import { getJsxName, getMeaningfulJsxChildren, hasTruthyAsChild, isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const radixAschildSingleChild = defineRule<Rule>({
  recommendation:
    "Radix asChild must receive exactly one element child that can accept props and refs; wrap multiple children in a single component that forwards props.",
  examples: [
    {
      before: `<Button asChild><Link href="/a">A</Link><span>New</span></Button>`,
      after: `<Button asChild><Link href="/a">A <span>New</span></Link></Button>`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXElement(node: EsTreeNode) {
      const openingElement = node.openingElement;
      if (!hasTruthyAsChild(openingElement)) return;
      const meaningfulChildren = getMeaningfulJsxChildren(node);
      if (meaningfulChildren.length === 1 && isNodeOfType(meaningfulChildren[0], "JSXElement"))
        return;
      const elementName = getJsxName(openingElement.name) ?? "component";
      context.report({
        node: openingElement,
        message: `${elementName} uses asChild but does not have exactly one element child - Radix can only clone a single prop-forwarding child`,
      });
    },
  }),
});
