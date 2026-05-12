import { defineRule } from "../../registry.js";
import {
  collectDepIdentifierNames,
  collectUseStateBindings,
  collectWrittenStateNamesInEffect,
  findTopLevelEffectCalls,
  getEffectCallback,
  isComponentAssignment,
  isExternalSyncEffect,
  isUppercaseName,
  isNodeOfType,
} from "./_utils.js";
import type { EffectInfo, EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noEffectChain = defineRule<Rule>({
  recommendation:
    "Merge dependent effects or derive intermediate values during render so updates flow from data, not from effect-to-effect state relays.",
  examples: [
    {
      before: `useEffect(() => setFiltered(filter(items)), [items]);
useEffect(() => setCount(filtered.length), [filtered]);`,
      after: `const filtered = filter(items);
const count = filtered.length;`,
    },
  ],
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || !isNodeOfType(componentBody, "BlockStatement")) return;

      const useStateBindings = collectUseStateBindings(componentBody);
      if (useStateBindings.length === 0) return;
      const setterToStateName = new Map<string, string>();
      for (const binding of useStateBindings) {
        setterToStateName.set(binding.setterName, binding.valueName);
      }

      const effectInfos: EffectInfo[] = [];
      for (const effectCall of findTopLevelEffectCalls(componentBody)) {
        const callback = getEffectCallback(effectCall);
        if (!callback) continue;
        effectInfos.push({
          node: effectCall,
          depNames: collectDepIdentifierNames(effectCall),
          writtenStateNames: collectWrittenStateNamesInEffect(callback, setterToStateName),
          isExternalSync: isExternalSyncEffect(callback),
        });
      }
      if (effectInfos.length < 2) return;

      const reportedNodes = new Set<EsTreeNode>();
      for (const writerEffect of effectInfos) {
        if (writerEffect.isExternalSync) continue;
        if (writerEffect.writtenStateNames.size === 0) continue;
        for (const readerEffect of effectInfos) {
          if (readerEffect === writerEffect) continue;
          if (readerEffect.isExternalSync) continue;
          if (readerEffect.depNames.size === 0) continue;

          let chainedStateName: string | null = null;
          for (const writtenName of writerEffect.writtenStateNames) {
            if (readerEffect.depNames.has(writtenName)) {
              chainedStateName = writtenName;
              break;
            }
          }
          if (!chainedStateName) continue;
          if (reportedNodes.has(readerEffect.node)) continue;
          reportedNodes.add(readerEffect.node);

          context.report({
            node: readerEffect.node,
            message: `useEffect reacts to "${chainedStateName}" which is set by another useEffect - chains of effects add an extra render per link and become rigid as code evolves. Compute what you can during render and write all related state inside the event handler that originally fires the chain`,
          });
        }
      }
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        checkComponent(node.body);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        checkComponent(node.init?.body);
      },
    };
  },
});
