import { defineRule } from "../../registry.js";
import {
  RENDER_PROP_PATTERN,
  RENDER_PROP_PROLIFERATION_THRESHOLD,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noRenderPropChildren = defineRule<Rule>({
  recommendation:
    "Prefer normal children, compound components, or named slot components instead of render-prop children for static composition.",
  examples: [
    {
      before: `<List>{(item) => <Row item={item} />}</List>`,
      after: `<List renderItem={(item) => <Row item={item} />} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXOpeningElement(node: EsTreeNode) {
      const renderPropAttributes: Array<{ name: string; node: EsTreeNode }> = [];
      for (const attribute of node.attributes ?? []) {
        if (!isNodeOfType(attribute, "JSXAttribute")) continue;
        if (!isNodeOfType(attribute.name, "JSXIdentifier")) continue;
        const name = attribute.name.name;
        if (!RENDER_PROP_PATTERN.test(name)) continue;
        renderPropAttributes.push({ name, node: attribute });
      }
      if (renderPropAttributes.length < RENDER_PROP_PROLIFERATION_THRESHOLD) return;

      const propList = renderPropAttributes
        .slice(0, 3)
        .map((entry) => entry.name)
        .join(", ");
      context.report({
        node: renderPropAttributes[0].node,
        message: `${renderPropAttributes.length} render-prop slots on the same element (${propList}…) - collapse into compound subcomponents or \`children\` so consumers don't need to know about every customization point`,
      });
    },
  }),
});
