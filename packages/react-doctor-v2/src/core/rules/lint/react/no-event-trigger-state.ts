import { defineRule } from "../../registry.js";
import {
  EFFECT_HOOK_NAMES,
  buildLocalDependencyGraph,
  collectHandlerBindingNames,
  collectHandlerOnlyWriteStateNames,
  collectRenderReachableNames,
  collectReturnExpressions,
  collectUseStateBindings,
  expandTransitiveDependencies,
  findTriggeredSideEffectCalleeName,
  getCallbackStatements,
  getEffectCallback,
  getTriggerGuardRootName,
  isComponentAssignment,
  isHookCall,
  isUppercaseName,
  walkAst,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noEventTriggerState = defineRule<Rule>({
  recommendation:
    "Call setters from the event handler itself instead of setting flags that an effect later observes to perform the real action.",
  examples: [
    {
      before: `const onClick = () => setShouldSave(true);
useEffect(() => { if (shouldSave) save(); }, [shouldSave]);`,
      after: `const onClick = () => save();`,
    },
  ],
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody || !isNodeOfType(componentBody, "BlockStatement")) return;

      const useStateBindings = collectUseStateBindings(componentBody);
      if (useStateBindings.length === 0) return;

      const handlerBindingNames = collectHandlerBindingNames(componentBody);
      const handlerOnlyWriteStateNames = collectHandlerOnlyWriteStateNames(
        componentBody,
        useStateBindings,
        handlerBindingNames,
      );
      if (handlerOnlyWriteStateNames.size === 0) return;

      // HACK: a state read in render (e.g. `<input value={query} />`)
      // is dual-purpose - it controls UI AND triggers the effect.
      // Calling it "exists only to schedule the effect" is wrong; the
      // user can't just delete the state. Reuse the same render-
      // reachability machinery that `rerenderStateOnlyInHandlers`
      // uses to filter these out (transitive dep graph + walk from
      // return expressions).
      const returnExpressions = collectReturnExpressions(componentBody);
      const dependencyGraph = buildLocalDependencyGraph(componentBody);
      const directRenderNames = collectRenderReachableNames(returnExpressions);
      const renderReachableNames = expandTransitiveDependencies(directRenderNames, dependencyGraph);

      walkAst(componentBody, (effectCall: EsTreeNode) => {
        if (!isNodeOfType(effectCall, "CallExpression")) return;
        if (!isHookCall(effectCall, EFFECT_HOOK_NAMES)) return;
        if ((effectCall.arguments?.length ?? 0) < 2) return;

        const depsNode = effectCall.arguments[1];
        if (!isNodeOfType(depsNode, "ArrayExpression")) return;
        if ((depsNode.elements?.length ?? 0) !== 1) return;

        const depElement = depsNode.elements[0];
        if (!isNodeOfType(depElement, "Identifier")) return;
        if (!handlerOnlyWriteStateNames.has(depElement.name)) return;
        // Dual-purpose state - used in render too. Don't claim it
        // "exists only to schedule" the effect.
        if (renderReachableNames.has(depElement.name)) return;

        const callback = getEffectCallback(effectCall);
        if (!callback) return;

        const bodyStatements = getCallbackStatements(callback);
        if (bodyStatements.length !== 1) return;
        const soleStatement = bodyStatements[0];
        if (!isNodeOfType(soleStatement, "IfStatement")) return;

        const guardRootName = getTriggerGuardRootName(soleStatement.test);
        if (guardRootName !== depElement.name) return;

        const sideEffectCalleeName = findTriggeredSideEffectCalleeName(soleStatement.consequent);
        if (!sideEffectCalleeName) return;

        context.report({
          node: effectCall,
          message: `useState "${depElement.name}" exists only to schedule "${sideEffectCalleeName}(...)" from a useEffect - call "${sideEffectCalleeName}(...)" directly inside the event handler that sets it, and delete the state`,
        });
      });
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
