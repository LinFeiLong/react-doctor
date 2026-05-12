import { defineRule } from "../../registry.js";
import { HIGH_FREQUENCY_DOM_EVENTS, handlerCallsSetState } from "../performance/_utils.js";
import { isNodeOfType } from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const eventNameFromAttribute = (attributeName: string): string | null => {
  if (!attributeName.startsWith("on")) return null;
  return attributeName.slice(2).toLowerCase();
};

export const rerenderUseRefTransientValues = defineRule<Rule>({
  recommendation:
    "Keep high-frequency transient values in refs or external stores and commit React state only when visible UI must update.",
  examples: [
    {
      before: `const [x, setX] = useState(0);
<div onMouseMove={(event) => setX(event.clientX)} />`,
      after: `const xRef = useRef(0);
<div onMouseMove={(event) => { xRef.current = event.clientX; }} />`,
    },
  ],
  create: (context: RuleContext) => ({
    JSXAttribute(node: EsTreeNode) {
      if (!isNodeOfType(node.name, "JSXIdentifier")) return;
      const eventName = eventNameFromAttribute(node.name.name);
      if (!eventName || !HIGH_FREQUENCY_DOM_EVENTS.has(eventName)) return;
      if (!isNodeOfType(node.value, "JSXExpressionContainer")) return;
      const handler = node.value.expression;
      if (!handler) return;
      const setStateCall = handlerCallsSetState(handler);
      if (!setStateCall) return;
      context.report({
        node: setStateCall,
        message:
          "high-frequency event stores transient data in React state - keep it in a ref or external store and only commit state when UI actually needs to re-render",
      });
    },
  }),
});
