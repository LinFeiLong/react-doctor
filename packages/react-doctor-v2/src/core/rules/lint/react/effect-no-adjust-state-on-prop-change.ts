import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  collectDepIdentifierNames,
  collectValueIdentifierNames,
  createComponentPropStackTracker,
  getEffectCallback,
  isHookCall,
  isSetterCall,
  walkInsideStatementBlocks,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

const hasAnyName = (names: Iterable<string>, candidates: ReadonlySet<string>): boolean => {
  for (const name of names) {
    if (candidates.has(name)) return true;
  }
  return false;
};

export const effectNoAdjustStateOnPropChange = defineRule<Rule>({
  recommendation:
    "Do not adjust local state from a prop-change effect; either derive the value during render or restructure state so the prop change does not need a synchronizing effect.",
  examples: [
    {
      before: `function List({ items }) {
  const [selection, setSelection] = useState(null);
  useEffect(() => setSelection(null), [items]);
}`,
      after: `function List({ items }) {
  const [prevItems, setPrevItems] = useState(items);
  const [selection, setSelection] = useState(null);
  if (items !== prevItems) {
    setPrevItems(items);
    setSelection(null);
  }
}`,
    },
  ],
  create: (context: RuleContext) => {
    const propTracker = createComponentPropStackTracker();

    return {
      ...propTracker.visitors,
      CallExpression(node: EsTreeNode) {
        if (!isHookCall(node, EFFECT_HOOK_NAMES)) return;
        const propNames = propTracker.getCurrentPropNames();
        if (propNames.size === 0) return;
        if (!hasAnyName(collectDepIdentifierNames(node), propNames)) return;
        const callback = getEffectCallback(node);
        if (!callback) return;

        walkInsideStatementBlocks(callback.body, (child) => {
          if (!isSetterCall(child)) return;
          const argumentNames: string[] = [];
          collectValueIdentifierNames(child.arguments?.[0], argumentNames);
          if (hasAnyName(argumentNames, propNames)) return;
          context.report({
            node: child,
            message:
              "state adjusted from a prop-change effect - derive during render or reset state directly while rendering instead of synchronizing after paint",
          });
        });
      },
    };
  },
});
