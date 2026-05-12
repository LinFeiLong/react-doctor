import { defineRule } from "../../registry.js";
import {
  BUILTIN_GLOBAL_NAMESPACE_NAMES,
  EFFECT_HOOK_NAMES,
  TRIVIAL_DERIVATION_CALLEE_NAMES,
  collectValueIdentifierNames,
  getCallbackStatements,
  getEffectCallback,
  getRootIdentifierName,
  isHookCall,
  isSetterCall,
  isSetterIdentifier,
  walkAst,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noDerivedStateEffect = defineRule<Rule>({
  recommendation:
    "Derive values during render or memoize expensive derivations with useMemo instead of copying them into state from an effect.",
  examples: [
    {
      before: `useEffect(() => setFullName(\`\${first} \${last}\`), [first, last]);`,
      after: `const fullName = \`\${first} \${last}\`;`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isHookCall(node, EFFECT_HOOK_NAMES) || (node.arguments?.length ?? 0) < 2) return;

      const callback = getEffectCallback(node);
      if (!callback) return;

      const depsNode = node.arguments[1];
      if (!isNodeOfType(depsNode, "ArrayExpression") || !depsNode.elements?.length) return;

      const dependencyNames = new Set(
        depsNode.elements
          .filter((element: EsTreeNode) => isNodeOfType(element, "Identifier"))
          .map((element: EsTreeNode) => element.name),
      );
      if (dependencyNames.size === 0) return;

      const statements = getCallbackStatements(callback);
      if (statements.length === 0) return;

      const containsOnlySetStateCalls = statements.every((statement: EsTreeNode) => {
        if (!isNodeOfType(statement, "ExpressionStatement")) return false;
        return isSetterCall(statement.expression);
      });
      if (!containsOnlySetStateCalls) return;

      let allArgumentsDeriveFromDeps = true;
      let hasAnyDependencyReference = false;
      // §2 of "You Might Not Need an Effect" branches the suggested
      // fix on whether the derivation is potentially expensive. A
      // setter argument that contains a user-defined CallExpression
      // (e.g. `setVisibleTodos(getFilteredTodos(todos, filter))`)
      // gets the `useMemo` recommendation; pure data shaping like
      // `firstName + " " + lastName` keeps the cheaper "compute
      // during render" message.
      let hasExpensiveDerivation = false;
      for (const statement of statements) {
        const setStateArguments = statement.expression.arguments;
        if (!setStateArguments?.length) continue;

        const valueIdentifierNames: string[] = [];
        collectValueIdentifierNames(setStateArguments[0], valueIdentifierNames);

        walkAst(setStateArguments[0], (child: EsTreeNode) => {
          if (!isNodeOfType(child, "CallExpression")) return;
          if (isNodeOfType(child.callee, "MemberExpression")) {
            // `Math.floor(x)` / `Date.now()` are trivial regardless
            // of the property - gate on the chain root, not the
            // method name (which would never match TRIVIAL_*).
            const rootName = getRootIdentifierName(child.callee);
            if (rootName && BUILTIN_GLOBAL_NAMESPACE_NAMES.has(rootName)) return;
            hasExpensiveDerivation = true;
            return;
          }
          if (isNodeOfType(child.callee, "Identifier")) {
            const calleeName = child.callee.name;
            if (
              !TRIVIAL_DERIVATION_CALLEE_NAMES.has(calleeName) &&
              !isSetterIdentifier(calleeName)
            ) {
              hasExpensiveDerivation = true;
            }
          }
        });

        const nonSetterIdentifiers = valueIdentifierNames.filter(
          (name) => !isSetterIdentifier(name),
        );

        if (nonSetterIdentifiers.some((name) => dependencyNames.has(name))) {
          hasAnyDependencyReference = true;
        }

        if (nonSetterIdentifiers.some((name) => !dependencyNames.has(name))) {
          allArgumentsDeriveFromDeps = false;
          break;
        }
      }

      if (!allArgumentsDeriveFromDeps) return;

      // HACK: a user-defined function call inside the setter arg
      // (`setFilteredItems(applyFilters())`) closes over reactive
      // values implicitly - it's a derivation, not a "state reset".
      // Without this, a zero-arg call would leave the identifier list
      // empty and the message would vacuously default to the wrong
      // "state reset" branch.
      if (hasExpensiveDerivation) hasAnyDependencyReference = true;

      let message: string;
      if (!hasAnyDependencyReference) {
        message =
          "State reset in useEffect - use a key prop to reset component state when props change";
      } else if (hasExpensiveDerivation) {
        message =
          "Derived state in useEffect - wrap the calculation in useMemo([deps]) (or compute it directly during render if it isn't expensive)";
      } else {
        message = "Derived state in useEffect - compute during render instead";
      }

      context.report({ node, message });
    },
  }),
});
