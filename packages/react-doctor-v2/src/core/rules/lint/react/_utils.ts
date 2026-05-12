import {
  walkAst,
  collectPatternNames,
  isHookCall,
  walkInsideStatementBlocks,
  isSetterIdentifier,
  getRootIdentifierName,
  getCallbackStatements,
  findJsxAttribute,
  isNodeOfType,
} from "../utils.js";
import type { EsTreeNode, Rule, RuleContext, RuleExample } from "../utils.js";
import {
  EVENT_TRIGGERED_SIDE_EFFECT_CALLEES,
  EVENT_TRIGGERED_SIDE_EFFECT_MEMBER_METHODS,
  TIMER_CALLEE_NAMES_REQUIRING_CLEANUP,
  BUILTIN_GLOBAL_NAMESPACE_NAMES,
  SUBSCRIPTION_METHOD_NAMES,
  TIMER_AND_SCHEDULER_DIRECT_CALLEE_NAMES,
  MUTABLE_GLOBAL_ROOTS,
  EFFECT_HOOK_NAMES,
  EVENT_TRIGGERED_NAVIGATION_METHOD_NAMES,
  NAVIGATION_RECEIVER_NAMES,
  EXTERNAL_SYNC_AMBIGUOUS_HTTP_METHOD_NAMES,
  EXTERNAL_SYNC_DIRECT_CALLEE_NAMES,
  EXTERNAL_SYNC_HTTP_CLIENT_RECEIVERS,
  EXTERNAL_SYNC_MEMBER_METHOD_NAMES,
  EXTERNAL_SYNC_OBSERVER_CONSTRUCTORS,
  CLEANUP_LIKE_RELEASE_CALLEE_NAMES,
  TIMER_CLEANUP_CALLEE_NAMES,
  UNSUBSCRIPTION_METHOD_NAMES,
  INDEX_PARAMETER_NAMES,
} from "../constants.js";

export const BOOLEAN_PROP_PREFIX_PATTERN =
  /^(?:is|has|should|can|show|hide|enable|disable|with)[A-Z]/;

export interface DeprecatedReactImportRuleOptions {
  /** The exact `import "..."` source string this rule watches. */
  source: string;
  recommendation: string;
  examples?: RuleExample[];
  /** Per-imported-name message dictionary. Exact-match lookup. */
  messages: ReadonlyMap<string, string>;
  /**
   * Optional extra ImportDeclaration handler invoked BEFORE the standard
   * source check - used by the react-dom rule to flag every import from
   * `react-dom/test-utils` (whole entry point gone in React 19).
   * Return `true` to mark "handled, skip the standard branch".
   */
  handleExtraSource?: (node: EsTreeNode, context: RuleContext) => boolean;
}

// HACK: shared scaffolding for "report deprecated React-package imports".
// Both `noReact19DeprecatedApis` (for `react`) and
// `noReactDomDeprecatedApis` (for `react-dom`) want the same shape:
//   - bind namespace/default imports of the source to a Set
//   - on ImportSpecifier, look the imported name up in a message map
//   - on MemberExpression off a tracked binding, look the property up
// Hoisting the pattern keeps the two call sites tiny and means future
// React deprecations (e.g. a `react/jsx-runtime` rule) need just one
// new factory call.

export const HOOK_OBJECTS_WITH_METHODS = new Map<string, Set<string>>([
  ["useRouter", new Set(["push", "replace", "back", "forward", "refresh", "prefetch"])],
  [
    "useNavigation",
    new Set(["navigate", "push", "goBack", "popToTop", "reset", "replace", "dispatch"]),
  ],
  ["useSearchParams", new Set(["get", "getAll", "has", "set"])],
]);

// HACK: O(1) lookup. Indexes top-level `const x = useFooBar(...)`
// declarations once per component on enter, so subsequent
// MemberExpression visitors don't re-walk the whole body for every
// access.

export const LEGACY_CONTEXT_NAMES: ReadonlySet<string> = new Set([
  "childContextTypes",
  "contextTypes",
  "getChildContext",
]);

export const LEGACY_LIFECYCLE_REPLACEMENTS = new Map<string, string>([
  [
    "componentWillMount",
    "Move side effects to `componentDidMount`; move initial state to `constructor`",
  ],
  [
    "componentWillReceiveProps",
    "Move side effects to `componentDidUpdate` (compare prevProps); move pure state derivation to the static `getDerivedStateFromProps`",
  ],
  [
    "componentWillUpdate",
    "Move DOM reads to `getSnapshotBeforeUpdate` (passes the value to `componentDidUpdate`); move other work to `componentDidUpdate`",
  ],
]);

export const REACT_19_DEPRECATED_MESSAGES = new Map<string, string>([
  [
    "forwardRef",
    "forwardRef is no longer needed on React 19+ - refs are regular props on function components; remove forwardRef and pass ref directly",
  ],
  [
    "useContext",
    "useContext is superseded by `use()` on React 19+ - `use()` reads context conditionally inside hooks, branches, and loops; switch to `import { use } from 'react'`",
  ],
]);

export const REACT_DOM_DEPRECATED_MESSAGES = new Map<string, string>([
  [
    "render",
    "ReactDOM.render is the legacy root API - switch to `import { createRoot } from 'react-dom/client'` and call `createRoot(container).render(...)` (REMOVED in React 19)",
  ],
  [
    "hydrate",
    "ReactDOM.hydrate is the legacy SSR API - switch to `import { hydrateRoot } from 'react-dom/client'` and call `hydrateRoot(container, <App />)` (REMOVED in React 19)",
  ],
  [
    "unmountComponentAtNode",
    "ReactDOM.unmountComponentAtNode no longer works on roots created with `createRoot` - keep a reference to the root and call `root.unmount()` instead (REMOVED in React 19)",
  ],
  [
    "findDOMNode",
    "ReactDOM.findDOMNode crawls the rendered tree and breaks composition - accept a ref directly and read `ref.current` (REMOVED in React 19)",
  ],
]);

export const REACT_DOM_TEST_UTILS_REPLACEMENTS = new Map<string, string>([
  ["act", "`import { act } from 'react'` instead"],
  ["Simulate", "`fireEvent` from `@testing-library/react` instead"],
  ["renderIntoDocument", "`render` from `@testing-library/react` instead"],
  ["findRenderedDOMComponentWithTag", "`getByRole` / `getByTestId` from `@testing-library/react`"],
  ["findRenderedDOMComponentWithClass", "`getByRole` or `container.querySelector` from RTL"],
  ["scryRenderedDOMComponentsWithTag", "`getAllByRole` from `@testing-library/react`"],
]);

export const RENDER_PROP_PATTERN = /^render[A-Z]/;

// HACK: render-prop proliferation (`<Foo renderHeader={…} renderFooter={…}
// renderActions={…} />`) is the smell - a single render-prop is often
// the legitimate library API (MUI Autocomplete's `renderInput`, FlatList's
// `renderItem`, react-hook-form's Controller `render`, etc.) and we
// shouldn't fire on those. Instead we flag the COMPOUND case: when a
// single element receives 3 or more `render*` props, that's the smell
// of "many slots cobbled together where compound components or
// `children` would be cleaner".

export interface UnsafePrefixSplit {
  baseName: string;
  hasUnsafePrefix: boolean;
}

export const buildHookBindingMap = (componentBody: EsTreeNode): Map<string, string> => {
  const result = new Map<string, string>();
  if (!isNodeOfType(componentBody, "BlockStatement")) return result;
  for (const statement of componentBody.body ?? []) {
    if (!isNodeOfType(statement, "VariableDeclaration")) continue;
    for (const declarator of statement.declarations ?? []) {
      if (!isNodeOfType(declarator.id, "Identifier")) continue;
      if (!isNodeOfType(declarator.init, "CallExpression")) continue;
      const callee = declarator.init.callee;
      if (!isNodeOfType(callee, "Identifier")) continue;
      result.set(declarator.id.name, callee.name);
    }
  }
  return result;
};

// HACK: React Compiler memoizes inside a component based on stable
// reference equality of *destructured* values. `router.push("/x")`
// reads `push` off the hook return on every render, which the compiler
// can't memoize as cleanly as a destructured `const { push } = useRouter()`.
// The destructured form also makes the dependency graph obvious - if
// you only need `push`, the compiler doesn't need to track all of
// `router`. This is a soft signal even without React Compiler enabled
// (it makes intent clearer and reduces accidental capture).
//
// Heuristic: `router.push(...)` (or any of the canonical hook objects)
// where `router` is bound to a `useRouter()` call in the same component.
// We don't fire when the binding is destructured already.

// HACK: the three legacy class lifecycles `componentWillMount`,
// `componentWillReceiveProps`, and `componentWillUpdate` are unsafe
// under concurrent rendering because the renderer can call them, throw
// the work away, and call them again. React 18.3.1 emits a warning;
// React 19 REMOVES them entirely (the `UNSAFE_` prefix included). We
// flag both forms so the prefix doesn't get treated as a permanent fix.
//
// Stored as a Map (not a plain object) because plain-object lookups inherit
// from `Object.prototype` - `LEGACY_LIFECYCLE_REPLACEMENTS["constructor"]`
// returns the native `Object` function (truthy), which previously made the
// rule false-positive on every class with a constructor (Lexical nodes,
// MobX stores, custom Error subclasses, etc.). Maps return `undefined` for
// missing keys with no prototype fall-through.

export const buildLegacyContextMessage = (memberName: string): string => {
  if (memberName === "childContextTypes" || memberName === "getChildContext") {
    return `${memberName} is part of the legacy context API (REMOVED in React 19). Replace the provider with \`createContext\` + \`<MyContext.Provider value={...}>\` and consume via \`useContext()\` (or \`use()\` on React 19+) - every consumer must migrate together`;
  }
  return "contextTypes is part of the legacy context API (REMOVED in React 19). Replace with `static contextType = MyContext` (single context) or read the modern context with `useContext()` / `use()` from a function component - coordinate with the provider's migration";
};

export const stripUnsafePrefix = (name: string): UnsafePrefixSplit => {
  if (name.startsWith("UNSAFE_")) {
    return { baseName: name.slice("UNSAFE_".length), hasUnsafePrefix: true };
  }
  return { baseName: name, hasUnsafePrefix: false };
};

export const buildLegacyLifecycleMessage = (originalName: string): string | null => {
  const { baseName, hasUnsafePrefix } = stripUnsafePrefix(originalName);
  const replacement = LEGACY_LIFECYCLE_REPLACEMENTS.get(baseName);
  if (!replacement) return null;
  const removalNote = hasUnsafePrefix
    ? `\`${originalName}\` is removed in React 19 (the UNSAFE_ prefix only silences the React 18 warning, it doesn't fix the concurrent-mode hazard).`
    : `\`${originalName}\` is removed in React 19 and warns in React 18.3.1.`;
  return `${removalNote} ${replacement}.`;
};

// HACK: legacy context (`childContextTypes` + `getChildContext` on
// providers, `contextTypes` on consumers) was deprecated in 16.3, warns
// in 18.3.1, and is REMOVED in 19. Migration is cross-file (provider +
// every consumer must be moved together) so flagging surface area early
// is high-leverage. We catch the static class-property forms AND the
// `Foo.contextTypes = {...}` shape - both styles appear in the wild,
// and missing one leaves silent gaps.

export const buildTestUtilsMessage = (importedName: string): string => {
  const replacement = REACT_DOM_TEST_UTILS_REPLACEMENTS.get(importedName);
  const replacementText = replacement
    ? `Use ${replacement}.`
    : "Switch to `act` from `react` or the equivalent in `@testing-library/react`.";
  return `react-dom/test-utils is removed in React 19. ${replacementText}`;
};

export const collectBooleanLikePropsFromBody = (
  componentBody: EsTreeNode | undefined,
  propsParamName: string,
): Set<string> => {
  const found = new Set<string>();
  if (!componentBody) return found;
  walkAst(componentBody, (child: EsTreeNode) => {
    if (!isNodeOfType(child, "MemberExpression")) return;
    if (child.computed) return;
    if (!isNodeOfType(child.object, "Identifier")) return;
    if (child.object.name !== propsParamName) return;
    if (!isNodeOfType(child.property, "Identifier")) return;
    if (!BOOLEAN_PROP_PREFIX_PATTERN.test(child.property.name)) return;
    found.add(child.property.name);
  });
  return found;
};

// HACK: components with many boolean props (isLoading, hasIcon, showHeader,
// canEdit...) typically signal "many UI variants jammed into one component"
// - a sign that the component should be split via composition (compound
// components, explicit variant components). We use a name-based heuristic
// because TypeScript types aren't visible at this AST layer. Detects
// both destructured form (`{ isPrimary, hasIcon }`) and non-destructured
// (`function Foo(props) { props.isPrimary }`) by walking member-access
// patterns on the parameter binding.

// HACK: React 19+ deprecated `forwardRef` (refs are now regular props on
// function components) and `useContext` (replaced by the more flexible
// `use()`). Catches both named imports (`import { forwardRef } from "react"`)
// AND member access on namespace/default imports (`React.forwardRef`,
// `React.useContext` after `import React from "react"` or
// `import * as React from "react"`).
//
// Stored as a Map (not a plain object) because plain-object lookups inherit
// from `Object.prototype` - `messages["constructor"]` returns the native
// `Object` function, which is truthy and would silently false-positive on
// `import { constructor } from "react"` or `React.toString()`. Maps return
// `undefined` for missing keys with no prototype fall-through.

export const createDeprecatedReactImportRule = ({
  source,
  recommendation,
  examples,
  messages,
  handleExtraSource,
}: DeprecatedReactImportRuleOptions): Rule => ({
  recommendation,
  examples,
  create: (context: RuleContext) => {
    const namespaceBindings = new Set<string>();

    return {
      ImportDeclaration(node: EsTreeNode) {
        const sourceValue = node.source?.value;
        if (typeof sourceValue !== "string") return;
        if (handleExtraSource?.(node, context)) return;
        if (sourceValue !== source) return;

        for (const specifier of node.specifiers ?? []) {
          if (isNodeOfType(specifier, "ImportSpecifier")) {
            const importedName = specifier.imported?.name;
            if (!importedName) continue;
            const message = messages.get(importedName);
            if (message) context.report({ node: specifier, message });
            continue;
          }
          if (
            isNodeOfType(specifier, "ImportDefaultSpecifier") ||
            isNodeOfType(specifier, "ImportNamespaceSpecifier")
          ) {
            const localName = specifier.local?.name;
            if (localName) namespaceBindings.add(localName);
          }
        }
      },
      MemberExpression(node: EsTreeNode) {
        if (namespaceBindings.size === 0) return;
        if (node.computed) return;
        if (!isNodeOfType(node.object, "Identifier")) return;
        if (!namespaceBindings.has(node.object.name)) return;
        if (!isNodeOfType(node.property, "Identifier")) return;
        const message = messages.get(node.property.name);
        if (message) context.report({ node, message });
      },
    };
  },
});

export const isInsideClassBody = (node: EsTreeNode): boolean => {
  let current = node.parent;
  while (current) {
    if (isNodeOfType(current, "ClassBody")) return true;
    if (
      isNodeOfType(current, "FunctionDeclaration") ||
      isNodeOfType(current, "FunctionExpression") ||
      isNodeOfType(current, "ArrowFunctionExpression")
    ) {
      return false;
    }
    current = current.parent;
  }
  return false;
};

// HACK: React 19 removes `Component.defaultProps` for FUNCTION components
// (class components still tolerate it but the team recommends ES6
// default parameters anyway). Detection target: any
// `<Identifier>.defaultProps = <ObjectExpression>` assignment where the
// identifier looks like a component (uppercase first letter). We can't
// distinguish class vs function from the assignment alone, but the
// recommendation is the same either way - switch to ES6 default params
// in destructured props - so the guidance is uniform.

// HACK: companion to `noReact19DeprecatedApis` for the react-dom side
// of the React 19 migration. Catches the legacy root API (render /
// hydrate / unmountComponentAtNode) and findDOMNode. The whole
// `react-dom/test-utils` entry point is gone in 19; we flag every
// import from it and steer users to `act` from `react` plus
// `fireEvent` / `render` from @testing-library/react. Kept as a
// separate rule from `noReact19DeprecatedApis` so the per-source
// binding tracking stays simple - `react` and `react-dom` namespace
// imports never collide.
//
// Deliberately omitted: `useFormState`. It's the *current* correct API
// in React 18 (`react-dom`) - only renamed to `useActionState` and
// moved to `react` in 19. A whole-rule version gate (`>= 18`) can't
// distinguish "still on 18" from "should have migrated" inside the
// rule, so we drop the entry rather than false-positive on 18 code.

export const reportTestUtilsImports = (node: EsTreeNode, context: RuleContext): void => {
  for (const specifier of node.specifiers ?? []) {
    if (isNodeOfType(specifier, "ImportSpecifier")) {
      const importedName = specifier.imported?.name ?? "default";
      context.report({ node: specifier, message: buildTestUtilsMessage(importedName) });
      continue;
    }
    context.report({
      node: specifier,
      message:
        "react-dom/test-utils is removed in React 19. Use `act` from `react` and `fireEvent` / `render` from `@testing-library/react` instead",
    });
  }
};

export interface CallableReadClassification {
  hasAnyRead: boolean;
  allReadsAreInSubHandlers: boolean;
  firstSubHandlerName: string | null;
}

export const DEFERRABLE_HOOK_NAMES = new Set(["useSearchParams", "useParams", "usePathname"]);

export interface EffectInfo {
  node: EsTreeNode;
  depNames: Set<string>;
  writtenStateNames: Set<string>;
  isExternalSync: boolean;
}

// HACK: "Lifecycle of Reactive Effects" - Can global or mutable
// values be dependencies? - calls out that `location.pathname`,
// `ref.current`, and other mutable values can't be deps:
//
//   "Mutable values aren't reactive. Changing it wouldn't trigger
//    a re-render, so even if you specified it in the dependencies,
//    React wouldn't know to re-synchronize the Effect."
//
// We flag two shapes:
//   (1) MemberExpression rooted in a known mutable global
//       (location, window, document, navigator, history, ...) -
//       e.g. `location.pathname`, `window.innerWidth`, `document.title`
//   (2) MemberExpression `<x>.current` where `x` is a `useRef`
//       binding declared in the same component
//
// Bare `location` / bare `useRef`-returned identifiers are NOT
// flagged - those are themselves stable references; only their
// mutable property reads are the bug.

export interface MirrorBinding {
  valueName: string;
  setterName: string;
  initializer: EsTreeNode;
  propRootName: string;
}

// HACK: From "Lifecycle of Reactive Effects":
//
//   "Each Effect describes a separate synchronization process. When
//    the component is removed, your Effect needs to stop synchronizing.
//    The cleanup function should stop or undo whatever the Effect was
//    doing."
//
// An effect that adds a listener / subscribes / sets a timer but
// returns no cleanup leaks memory and triggers React's "you forgot
// to clean up an effect" StrictMode hint at runtime. We flag it
// statically. Three subscribe-shaped families:
//   - addEventListener (browser DOM, EventTarget-shaped libs)
//   - subscribe / addListener / on / watch / listen / sub
//   - setInterval / setTimeout (without explicit clear)
//
// The subscribe / unsubscribe method allowlists live in `constants.ts`
// (`SUBSCRIPTION_METHOD_NAMES`, `UNSUBSCRIPTION_METHOD_NAMES`) so the
// cleanup-needed detector and the prefer-use-sync-external-store
// detector share a single source of truth. Inline duplicates would
// silently drift out of sync as new library shapes get added.

export const SENTINEL_IDENTIFIER_NAMES = new Set(["undefined", "NaN", "null"]);

export const STATE_ARITHMETIC_OPERATORS = new Set(["+", "-", "*", "/", "%", "**"]);

// HACK: derive the state variable name from the setter name. `setCount` →
// `count`. We only flag arithmetic when one operand actually matches that
// derived name; otherwise `setCount(1 + computedValue)` would false-positive
// against any incidental Identifier on either side.

export interface SubscribeLikeUsage {
  kind: "subscribe" | "timer";
  resourceName: string;
}

export const collectIdentifierNames = (expression: EsTreeNode): Set<string> => {
  const names = new Set<string>();
  walkAst(expression, (child: EsTreeNode) => {
    if (isNodeOfType(child, "Identifier")) names.add(child.name);
  });
  return names;
};

// Build a "name -> identifiers it transitively depends on" graph for
// every top-level VariableDeclarator in the component body. Includes
// names referenced anywhere inside the initializer (deps arrays, nested
// callbacks, member access - we deliberately over-approximate here so
// that `useMemo(() => derive(state), [state])` propagates `state` into
// the dependency set of the resulting variable).

export const buildLocalDependencyGraph = (componentBody: EsTreeNode): Map<string, Set<string>> => {
  const graph = new Map<string, Set<string>>();
  if (!isNodeOfType(componentBody, "BlockStatement")) return graph;
  const declaredNames = new Set<string>();
  for (const statement of componentBody.body ?? []) {
    if (!isNodeOfType(statement, "VariableDeclaration")) continue;
    for (const declarator of statement.declarations ?? []) {
      if (!declarator.init) continue;
      const dependencyNames = collectIdentifierNames(declarator.init);
      declaredNames.clear();
      collectPatternNames(declarator.id, declaredNames);
      for (const declaredName of declaredNames) {
        const existing = graph.get(declaredName);
        if (existing === undefined) {
          graph.set(declaredName, new Set(dependencyNames));
        } else {
          for (const dependencyName of dependencyNames) existing.add(dependencyName);
        }
      }
    }
  }
  return graph;
};

// "Read in render" = any identifier (`Identifier`, NOT `JSXIdentifier`)
// that appears anywhere inside a return expression - JSX text content,
// `{expression}` containers, attribute values like
// `<MyContext value={value}>` (the React Context case from #146),
// `style={…}`, `className={…}`, props passed to children, conditional
// chains, the lot. JSX element/tag names are `JSXIdentifier`, which we
// deliberately do not track - referring to a component by name does
// not "read" any value.

export const findEnclosingFunctionInsideEffect = (
  identifierNode: EsTreeNode,
  effectCallback: EsTreeNode,
): EsTreeNode | null => {
  let cursor: EsTreeNode | null = identifierNode.parent ?? null;
  while (cursor && cursor !== effectCallback) {
    if (
      isNodeOfType(cursor, "ArrowFunctionExpression") ||
      isNodeOfType(cursor, "FunctionExpression") ||
      isNodeOfType(cursor, "FunctionDeclaration")
    ) {
      return cursor;
    }
    cursor = cursor.parent ?? null;
  }
  return null;
};

export const getEnclosingFunctionBindingName = (enclosingFunction: EsTreeNode): string | null => {
  if (
    isNodeOfType(enclosingFunction, "FunctionDeclaration") &&
    isNodeOfType(enclosingFunction.id, "Identifier")
  ) {
    return enclosingFunction.id.name;
  }
  const directParent = enclosingFunction.parent;
  if (
    isNodeOfType(directParent, "VariableDeclarator") &&
    isNodeOfType(directParent.id, "Identifier")
  ) {
    return directParent.id.name;
  }
  if (
    isNodeOfType(directParent, "AssignmentExpression") &&
    directParent.right === enclosingFunction &&
    isNodeOfType(directParent.left, "Identifier")
  ) {
    return directParent.left.name;
  }
  return null;
};

export const isCallExpressionWithSubHandlerCallee = (callExpression: EsTreeNode): boolean => {
  if (!isNodeOfType(callExpression, "CallExpression")) return false;
  const callee = callExpression.callee;
  if (
    isNodeOfType(callee, "Identifier") &&
    TIMER_AND_SCHEDULER_DIRECT_CALLEE_NAMES.has(callee.name)
  ) {
    return true;
  }
  if (
    isNodeOfType(callee, "MemberExpression") &&
    isNodeOfType(callee.property, "Identifier") &&
    SUBSCRIPTION_METHOD_NAMES.has(callee.property.name)
  ) {
    return true;
  }
  return false;
};

export const findSubHandlerForEnclosingFunction = (
  enclosingFunction: EsTreeNode,
  effectCallback: EsTreeNode,
): EsTreeNode | null => {
  const directParent = enclosingFunction.parent;
  if (
    isNodeOfType(directParent, "CallExpression") &&
    directParent.arguments?.includes(enclosingFunction) &&
    isCallExpressionWithSubHandlerCallee(directParent)
  ) {
    return directParent;
  }

  const localName = getEnclosingFunctionBindingName(enclosingFunction);
  if (localName === null) return null;

  let matchingSubHandlerCall: EsTreeNode | null = null;
  walkAst(effectCallback, (child: EsTreeNode) => {
    if (matchingSubHandlerCall) return false;
    if (!isNodeOfType(child, "CallExpression")) return;
    if (!isCallExpressionWithSubHandlerCallee(child)) return;
    for (const argument of child.arguments ?? []) {
      if (isNodeOfType(argument, "Identifier") && argument.name === localName) {
        matchingSubHandlerCall = child;
        return false;
      }
    }
  });
  return matchingSubHandlerCall;
};

export const getSubHandlerCalleeName = (callExpression: EsTreeNode): string | null => {
  if (!isNodeOfType(callExpression, "CallExpression")) return null;
  const callee = callExpression.callee;
  if (isNodeOfType(callee, "Identifier")) return callee.name;
  if (isNodeOfType(callee, "MemberExpression") && isNodeOfType(callee.property, "Identifier")) {
    return callee.property.name;
  }
  return null;
};

// HACK: handles the dominant real-world shape where the handler is
// bound to a const before being passed to addEventListener / subscribe:
//
//   const handler = (event) => onKey(event.key);
//   window.addEventListener('keydown', handler);
//   return () => window.removeEventListener('keydown', handler);
//
// Walks up to the function-level node (the arrow expression) and checks
// for either a direct sub-handler argument position OR a const binding
// whose Identifier appears as an argument to a sub-handler call later
// in the same effect body.
// Resolve the enclosing function back to its local-binding name across
// the three idiomatic shapes:
//   const handler = (e) => ...      → VariableDeclarator binding
//   function handler(e) { ... }     → FunctionDeclaration self-binding
//   let handler; handler = (e) => ... → AssignmentExpression binding

export const classifyCallableReadsInsideEffect = (
  callableName: string,
  effectCallback: EsTreeNode,
): CallableReadClassification => {
  let hasAnyRead = false;
  let allReadsAreInSubHandlers = true;
  let firstSubHandlerName: string | null = null;

  walkAst(effectCallback, (child: EsTreeNode) => {
    if (!isNodeOfType(child, "Identifier")) return;
    if (child.name !== callableName) return;
    const parent = child.parent;
    if (isNodeOfType(parent, "ArrayExpression")) return;
    if (isNodeOfType(parent, "MemberExpression") && !parent.computed && parent.property === child) {
      return;
    }
    if (
      isNodeOfType(parent, "Property") &&
      !parent.computed &&
      !parent.shorthand &&
      parent.key === child
    ) {
      return;
    }

    hasAnyRead = true;

    const enclosingFunction = findEnclosingFunctionInsideEffect(child, effectCallback);
    if (!enclosingFunction) {
      allReadsAreInSubHandlers = false;
      return;
    }
    const subHandlerCall = findSubHandlerForEnclosingFunction(enclosingFunction, effectCallback);
    if (!subHandlerCall) {
      allReadsAreInSubHandlers = false;
      return;
    }
    if (firstSubHandlerName === null) {
      firstSubHandlerName = getSubHandlerCalleeName(subHandlerCall);
    }
  });

  return { hasAnyRead, allReadsAreInSubHandlers, firstSubHandlerName };
};

export const isReleaseLikeCall = (
  callNode: EsTreeNode,
  knownBoundReleaseNames: ReadonlySet<string>,
): boolean => {
  if (!isNodeOfType(callNode, "CallExpression")) return false;
  const callee = callNode.callee;
  if (isNodeOfType(callee, "Identifier")) {
    if (TIMER_CLEANUP_CALLEE_NAMES.has(callee.name)) return true;
    if (CLEANUP_LIKE_RELEASE_CALLEE_NAMES.has(callee.name)) return true;
    if (knownBoundReleaseNames.has(callee.name)) return true;
    return false;
  }
  if (isNodeOfType(callee, "MemberExpression") && isNodeOfType(callee.property, "Identifier")) {
    return UNSUBSCRIPTION_METHOD_NAMES.has(callee.property.name);
  }
  return false;
};

export const containsReleaseLikeCall = (
  node: EsTreeNode,
  knownBoundReleaseNames: ReadonlySet<string>,
): boolean => {
  let didFindRelease = false;
  walkAst(node, (child: EsTreeNode) => {
    if (didFindRelease) return false;
    if (isReleaseLikeCall(child, knownBoundReleaseNames)) {
      didFindRelease = true;
      return false;
    }
  });
  return didFindRelease;
};

// Recognizes the four cleanup-return shapes uniformly:
//   return unsub                              → bound name match
//   return store.subscribe(handler)           → subscribe call IS the unsub
//   return () => unsub()                      → closure releases via name
//   return () => store.removeListener(...)    → closure releases via verb

export const isSubscribeLikeCallExpression = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node, "CallExpression")) return false;
  if (!isNodeOfType(node.callee, "MemberExpression")) return false;
  if (!isNodeOfType(node.callee.property, "Identifier")) return false;
  return SUBSCRIPTION_METHOD_NAMES.has(node.callee.property.name);
};

// HACK: variables bound to a subscribe-like or timer-like call inside
// an effect body are CLEANUP TARGETS - `return X` or `() => X()` /
// `() => clearTimeout(X)` releases the resource. Collecting them here
// lets the shared release predicate accept user-named bindings
// (`const unsub = ...; return unsub`) without falling back to the
// previous "any Identifier is fine" behavior.

export const isCleanupReturn = (
  returnedValue: EsTreeNode | null | undefined,
  knownBoundReleaseNames: ReadonlySet<string>,
): boolean => {
  if (!returnedValue) return false;
  if (isNodeOfType(returnedValue, "Identifier")) {
    return knownBoundReleaseNames.has(returnedValue.name);
  }
  if (isSubscribeLikeCallExpression(returnedValue)) return true;
  if (
    isNodeOfType(returnedValue, "ArrowFunctionExpression") ||
    isNodeOfType(returnedValue, "FunctionExpression")
  ) {
    return containsReleaseLikeCall(returnedValue, knownBoundReleaseNames);
  }
  return false;
};

export const cleanupReleasesSubscription = (
  effectBodyStatements: EsTreeNode[],
  boundUnsubscribeName: string | null,
): boolean => {
  const lastStatement = effectBodyStatements[effectBodyStatements.length - 1];
  if (!isNodeOfType(lastStatement, "ReturnStatement")) return false;
  const knownBoundReleaseNames = new Set<string>();
  if (boundUnsubscribeName) knownBoundReleaseNames.add(boundUnsubscribeName);
  return isCleanupReturn(lastStatement.argument, knownBoundReleaseNames);
};

// HACK: §6 of "You Might Not Need an Effect" - sending a POST request:
//
//   const [jsonToSubmit, setJsonToSubmit] = useState(null);
//   useEffect(() => {
//     if (jsonToSubmit !== null) {
//       post('/api/register', jsonToSubmit);
//     }
//   }, [jsonToSubmit]);
//
//   function handleSubmit(event) {
//     event.preventDefault();
//     setJsonToSubmit({ firstName, lastName });   // ← only writer
//   }
//
// Detector pre-conditions (all must hold):
//   (1) useEffect with deps = [stateX] - single dep that's a useState
//       binding declared in this component
//   (2) effect body is a single IfStatement guarding on stateX with one
//       of: bare truthy, !== null/undefined, === Literal, or .length
//   (3) IfStatement.consequent contains a CallExpression whose callee
//       is in EVENT_TRIGGERED_SIDE_EFFECT_CALLEES OR a MemberExpression
//       whose property is in EVENT_TRIGGERED_SIDE_EFFECT_MEMBER_METHODS
//   (4) every setStateX call site is inside a JSX `on*` handler (or a
//       function bound to one) - i.e. the trigger is set only by user
//       interactions, never by other reactive logic
//
// Why all four matter: (1) + (2) recognize the "trigger guard" shape;
// (3) restricts to side effects users would associate with a button
// click; (4) is the strongest signal that the state exists *only* to
// schedule the effect, distinguishing this from §5 (event-shared logic
// triggered by props) which already has its own rule.
// HACK: in JS, `undefined` is parsed as an Identifier (not a Literal
// like `null`). For `x !== undefined`, both sides of the
// BinaryExpression are Identifiers, so a naive "first Identifier
// wins" pick can return `"undefined"` instead of the trigger state
// name - silently dropping the violation for the reversed
// (`undefined !== x`) ordering. Skip the `undefined` / `null`
// sentinel side so the actual state Identifier is what we return.

export const collectDepIdentifierNames = (effectNode: EsTreeNode): Set<string> => {
  const depNames = new Set<string>();
  const depsNode = effectNode.arguments?.[1];
  if (!isNodeOfType(depsNode, "ArrayExpression")) return depNames;
  for (const element of depsNode.elements ?? []) {
    if (isNodeOfType(element, "Identifier")) depNames.add(element.name);
  }
  return depNames;
};

// HACK: only count setter calls that actually run during the effect's
// synchronous body. A `setX` inside `setTimeout(() => setX(...))` or
// `.then(() => setX(...))` is a DEFERRED write - by the time it fires,
// the chain reader effect has already had its dep-update window. Treat
// only direct (non-nested-function) writes as chain triggers; that
// stops `noEffectChain` from over-flagging the dominant debounce /
// async-fetch shape that real codebases use.

export const collectFunctionLocalBindings = (functionNode: EsTreeNode): Set<string> => {
  const localBindings = new Set<string>();
  for (const param of functionNode.params ?? []) {
    collectPatternNames(param, localBindings);
  }
  if (isNodeOfType(functionNode.body, "BlockStatement")) {
    for (const statement of functionNode.body.body ?? []) {
      if (!isNodeOfType(statement, "VariableDeclaration")) continue;
      for (const declarator of statement.declarations ?? []) {
        collectPatternNames(declarator.id, localBindings);
      }
    }
  }
  return localBindings;
};

export const collectFunctionTypedLocalBindings = (componentBody: EsTreeNode): Set<string> => {
  const functionTypedLocals = new Set<string>();
  if (!isNodeOfType(componentBody, "BlockStatement")) return functionTypedLocals;
  for (const statement of componentBody.body ?? []) {
    if (!isNodeOfType(statement, "VariableDeclaration")) continue;
    for (const declarator of statement.declarations ?? []) {
      if (!isNodeOfType(declarator.id, "Identifier")) continue;
      if (!isNodeOfType(declarator.init, "CallExpression")) continue;
      if (!isHookCall(declarator.init, "useCallback")) continue;
      functionTypedLocals.add(declarator.id.name);
    }
  }
  return functionTypedLocals;
};

export const collectHandlerBindingNames = (componentBody: EsTreeNode): Set<string> => {
  const handlerNames = new Set<string>();
  walkAst(componentBody, (child: EsTreeNode) => {
    if (!isNodeOfType(child, "JSXAttribute")) return;
    if (!isNodeOfType(child.name, "JSXIdentifier")) return;
    if (!/^on[A-Z]/.test(child.name.name)) return;
    if (!isNodeOfType(child.value, "JSXExpressionContainer")) return;
    const expression = child.value.expression;
    if (isNodeOfType(expression, "Identifier")) handlerNames.add(expression.name);
  });
  return handlerNames;
};

export const isInsideEventHandler = (
  node: EsTreeNode,
  handlerBindingNames: Set<string>,
): boolean => {
  let cursor: EsTreeNode | null = node.parent ?? null;
  while (cursor) {
    if (
      isNodeOfType(cursor, "ArrowFunctionExpression") ||
      isNodeOfType(cursor, "FunctionExpression") ||
      isNodeOfType(cursor, "FunctionDeclaration")
    ) {
      let outer: EsTreeNode | null = cursor.parent ?? null;
      while (outer) {
        if (isNodeOfType(outer, "JSXAttribute")) {
          const attrName = isNodeOfType(outer.name, "JSXIdentifier") ? outer.name.name : null;
          if (attrName && /^on[A-Z]/.test(attrName)) return true;
          return false;
        }
        if (isNodeOfType(outer, "VariableDeclarator")) {
          const declaredName = isNodeOfType(outer.id, "Identifier") ? outer.id.name : null;
          return Boolean(declaredName && handlerBindingNames.has(declaredName));
        }
        if (isNodeOfType(outer, "Program")) return false;
        outer = outer.parent ?? null;
      }
      return false;
    }
    cursor = cursor.parent ?? null;
  }
  return false;
};

// HACK: subscribing to `useSearchParams()` / `useParams()` /
// `usePathname()` makes the component re-render whenever the URL state
// changes - even when the component only reads the value inside an
// onClick / onSubmit handler. In that case the value is read at click
// time anyway; the subscription is wasted work.
//
// Better pattern: read inside the handler via the underlying API
// (`new URL(window.location.href).searchParams`), or build a small
// custom hook that exposes a `getSearchParams()` getter without
// subscribing. The result is fewer renders without losing the data.
//
// Heuristic: hook value-name appears only inside arrow / function
// expressions that are themselves bound to JSX `on*` attributes.

// HACK: walks the component AST while tracking which state names are
// SHADOWED in the current scope by a nested function's params or
// var/let/const declarations. Without this, a handler that locally
// re-binds the state name (e.g. `const items = raw.split(",")` then
// `items.push(x)`) gets falsely flagged. We don't do real scope
// analysis (would need eslint-utils' ScopeManager) - just lexical
// param + top-level binding collection per function, which covers the
// >99% of real-world shadowing cases without false positives.

export const collectHandlerOnlyWriteStateNames = (
  componentBody: EsTreeNode,
  useStateBindings: Array<{ valueName: string; setterName: string; declarator: EsTreeNode }>,
  handlerBindingNames: Set<string>,
): Set<string> => {
  const handlerOnlyWriteStateNames = new Set<string>();
  for (const binding of useStateBindings) {
    let didFindAnySetterCall = false;
    let areAllSetterCallsInHandlers = true;
    walkAst(componentBody, (child: EsTreeNode) => {
      if (!areAllSetterCallsInHandlers) return false;
      if (!isNodeOfType(child, "CallExpression")) return;
      if (!isNodeOfType(child.callee, "Identifier")) return;
      if (child.callee.name !== binding.setterName) return;
      didFindAnySetterCall = true;
      if (!isInsideEventHandler(child, handlerBindingNames)) {
        areAllSetterCallsInHandlers = false;
      }
    });
    if (didFindAnySetterCall && areAllSetterCallsInHandlers) {
      handlerOnlyWriteStateNames.add(binding.valueName);
    }
  }
  return handlerOnlyWriteStateNames;
};

// HACK: §7 of "You Might Not Need an Effect" - chains of computations:
//
//   useEffect(() => { if (card.gold) setGoldCardCount(c => c + 1); }, [card]);
//   useEffect(() => { if (goldCardCount > 3) setRound(r => r + 1); }, [goldCardCount]);
//   useEffect(() => { if (round > 5) setIsGameOver(true); }, [round]);
//
// Each link adds one extra render to the tree below the component.
// More importantly, the chain is rigid: setting `card` to a value from
// the past re-fires every downstream effect.
//
// `noCascadingSetState` (already shipped) catches multi-setter calls
// inside ONE effect; it does NOT see across effects. This rule
// complements it by detecting the cross-effect dependence.
//
// Detector (per component body):
//   1. Collect every top-level useEffect call and, for each:
//        - depNames: Identifier names in the dep array
//        - writtenStateNames: state names whose setter is called in the body
//        - isExternalSync: body returns cleanup OR contains a recognized
//          external-system call (subscribe / addEventListener / fetch /
//          setInterval / new MutationObserver / etc.) OR mutates a ref
//   2. For every ordered pair (A, B) of distinct effects:
//        edge iff (writes(A) ∩ deps(B)) ≠ ∅  AND  ¬isExternalSync(A)
//                                            AND  ¬isExternalSync(B)
//   3. Report on every effect B that is the target of any edge,
//      naming the chained state and the upstream effect's writer.
//
// The article calls out one legitimate "chain" - a multi-step network
// cascade where each effect re-fetches based on the previous step's
// result. Those effects all have `isExternalSync = true` because they
// contain `fetch`, so the rule won't fire.

export const collectReleasableBindingNames = (effectCallback: EsTreeNode): Set<string> => {
  const releasableNames = new Set<string>();
  if (!isNodeOfType(effectCallback.body, "BlockStatement")) return releasableNames;
  for (const statement of effectCallback.body.body ?? []) {
    if (!isNodeOfType(statement, "VariableDeclaration")) continue;
    for (const declarator of statement.declarations ?? []) {
      if (!isNodeOfType(declarator.id, "Identifier")) continue;
      const init = declarator.init;
      if (!init || !isNodeOfType(init, "CallExpression")) continue;
      if (isSubscribeLikeCallExpression(init)) {
        releasableNames.add(declarator.id.name);
        continue;
      }
      if (
        isNodeOfType(init.callee, "Identifier") &&
        TIMER_CALLEE_NAMES_REQUIRING_CLEANUP.has(init.callee.name)
      ) {
        releasableNames.add(declarator.id.name);
      }
    }
  }
  return releasableNames;
};

// Single source of truth for "does this CallExpression release a
// previously-acquired effect resource?". Used by both
// `effectNeedsCleanup` and `prefer-use-sync-external-store` so the
// two rules can never disagree on what a cleanup looks like.

export const collectRenderReachableNames = (returnExpressions: EsTreeNode[]): Set<string> => {
  const names = new Set<string>();
  for (const expression of returnExpressions) {
    walkAst(expression, (child: EsTreeNode) => {
      if (isNodeOfType(child, "Identifier")) names.add(child.name);
    });
  }
  return names;
};

export const collectReturnExpressions = (componentBody: EsTreeNode): EsTreeNode[] => {
  if (!isNodeOfType(componentBody, "BlockStatement")) return [];
  const returns: EsTreeNode[] = [];
  for (const statement of componentBody.body ?? []) {
    if (isNodeOfType(statement, "ReturnStatement") && statement.argument) {
      returns.push(statement.argument);
      continue;
    }
    // Walk into IfStatement / TryStatement etc. for early-return JSX,
    // but stop at any nested function.
    walkInsideStatementBlocks(statement, (child) => {
      if (isNodeOfType(child, "ReturnStatement") && child.argument) {
        returns.push(child.argument);
      }
    });
  }
  return returns;
};

export const collectUseRefBindingNames = (componentBody: EsTreeNode): Set<string> => {
  const useRefBindings = new Set<string>();
  if (!isNodeOfType(componentBody, "BlockStatement")) return useRefBindings;
  for (const statement of componentBody.body ?? []) {
    if (!isNodeOfType(statement, "VariableDeclaration")) continue;
    for (const declarator of statement.declarations ?? []) {
      if (!isNodeOfType(declarator.id, "Identifier")) continue;
      if (!isNodeOfType(declarator.init, "CallExpression")) continue;
      if (!isHookCall(declarator.init, "useRef")) continue;
      useRefBindings.add(declarator.id.name);
    }
  }
  return useRefBindings;
};

export const collectUseStateBindings = (
  componentBody: EsTreeNode,
): Array<{ valueName: string; setterName: string; declarator: EsTreeNode }> => {
  const bindings: Array<{ valueName: string; setterName: string; declarator: EsTreeNode }> = [];
  if (!isNodeOfType(componentBody, "BlockStatement")) return bindings;

  for (const statement of componentBody.body ?? []) {
    if (!isNodeOfType(statement, "VariableDeclaration")) continue;
    for (const declarator of statement.declarations ?? []) {
      if (!isNodeOfType(declarator.id, "ArrayPattern")) continue;
      const elements = declarator.id.elements ?? [];
      if (elements.length < 2) continue;
      const valueElement = elements[0];
      const setterElement = elements[1];
      if (
        !isNodeOfType(valueElement, "Identifier") ||
        !isNodeOfType(setterElement, "Identifier") ||
        !isSetterIdentifier(setterElement.name)
      ) {
        continue;
      }
      if (!isNodeOfType(declarator.init, "CallExpression")) continue;
      if (!isHookCall(declarator.init, "useState")) continue;
      bindings.push({
        valueName: valueElement.name,
        setterName: setterElement.name,
        declarator,
      });
    }
  }
  return bindings;
};

// HACK: only collect return statements at the COMPONENT'S top level -
// nested function bodies (effect cleanups, useMemo/useCallback callbacks)
// have their own return semantics that aren't render output.

export const collectValueIdentifierNames = (
  node: EsTreeNode | null | undefined,
  into: string[],
): void => {
  if (!node || typeof node !== "object") return;
  if (isNodeOfType(node, "CallExpression")) {
    if (isNodeOfType(node.callee, "MemberExpression")) {
      // For `state.method(arg)`, `state` is a reactive read; `method`
      // is not. Skip the callee chain entirely when its root is a
      // built-in global (`Math.floor`, `JSON.parse`, ...) - those
      // aren't reactive reads either.
      const rootName = getRootIdentifierName(node.callee);
      if (!rootName || !BUILTIN_GLOBAL_NAMESPACE_NAMES.has(rootName)) {
        collectValueIdentifierNames(node.callee.object, into);
      }
    }
    for (const argument of node.arguments ?? []) {
      collectValueIdentifierNames(argument, into);
    }
    return;
  }
  if (isNodeOfType(node, "MemberExpression")) {
    const rootName = getRootIdentifierName(node);
    if (!rootName || !BUILTIN_GLOBAL_NAMESPACE_NAMES.has(rootName)) {
      collectValueIdentifierNames(node.object, into);
    }
    if (node.computed) collectValueIdentifierNames(node.property, into);
    return;
  }
  if (isNodeOfType(node, "Identifier")) {
    into.push(node.name);
    return;
  }
  for (const key of Object.keys(node)) {
    if (key === "parent" || key === "type") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && item.type) {
          collectValueIdentifierNames(item, into);
        }
      }
    } else if (child && typeof child === "object" && child.type) {
      collectValueIdentifierNames(child, into);
    }
  }
};

export const collectWrittenStateNamesInEffect = (
  effectCallback: EsTreeNode,
  setterToStateName: Map<string, string>,
): Set<string> => {
  const writtenStateNames = new Set<string>();
  walkInsideStatementBlocks(effectCallback.body, (child: EsTreeNode) => {
    if (!isNodeOfType(child, "CallExpression")) return;
    if (!isNodeOfType(child.callee, "Identifier")) return;
    const stateName = setterToStateName.get(child.callee.name);
    if (stateName) writtenStateNames.add(stateName);
  });
  return writtenStateNames;
};

// HACK: a useEffect cleanup return value MUST be a function (or
// undefined). Anything else is either user error or "I'm using
// `return` for early-exit, not for cleanup". For the chain detector,
// we treat only function-shaped returns as "this effect owns an
// external resource" - bare literals (`return null`, `return 0`) and
// state reads (`return foo`) get ignored so they don't silently
// disable chain detection.

export const deriveStateVariableName = (setterName: string): string | null => {
  if (!setterName.startsWith("set") || setterName.length < 4) return null;
  return setterName.charAt(3).toLowerCase() + setterName.slice(4);
};

// HACK: `useEffect(() => parentCallback(state.x), [state.x])` is the
// "lift state up via callback" anti-pattern: the child owns state, then
// fires a parent callback every time the state changes to keep the
// parent in sync. The parent has no real ground-truth state, just a
// stale mirror. The right shape is to lift state into a Provider that
// both child and parent read from; the child then doesn't need an
// effect-driven sync at all.

// HACK: useEffectEvent's identity is intentionally unstable - it captures
// the latest props/state on each call. Listing it in a useEffect/useMemo/
// useCallback dep array fundamentally misuses the API and would cause the
// effect to re-run constantly. The recommended pattern is to call the
// effect-event from inside the effect body without listing it as a dep.
//
// Bindings are scoped per-component using a stack so a `useEffectEvent`
// binding named `onChange` in ComponentA doesn't taint a regular variable
// `onChange` in ComponentB in the same file.

// HACK: a useState whose value is never read in the component's JSX
// return is by definition not visual state - every setState triggers a
// render that produces the same DOM. Use `useRef` (`ref.current = ...`)
// so updates don't trigger re-renders. (For values read inside an
// addEventListener-style callback, a ref also lets the handler always
// see the latest value without re-subscribing each effect run.)

export const effectHasCleanupRelease = (callback: EsTreeNode): boolean => {
  // HACK: expression-body arrows are the dominant shape for trivial
  // subscribe-only effects:
  //
  //   useEffect(() => store.subscribe(handler), []);
  //
  // The arrow's expression body IS the body, and its evaluation
  // result is implicitly returned as the effect's cleanup function.
  // For subscribe-shaped calls we know the return value is the
  // unsubscribe - accept this case before the BlockStatement-only
  // checks below.
  if (!isNodeOfType(callback.body, "BlockStatement")) {
    return isSubscribeLikeCallExpression(callback.body);
  }
  const knownBoundReleaseNames = collectReleasableBindingNames(callback);
  // HACK: scan ALL `return` statements at the effect's own function
  // scope (skipping nested functions via `walkInsideStatementBlocks`),
  // not just the top-level last statement. The last-statement check
  // false-positives on the very common conditional-cleanup shape:
  //
  //   useEffect(() => {
  //     if (!enabled) return;
  //     const sub = subscribe(...);
  //     if (someCondition) {
  //       return () => sub();
  //     }
  //   }, [enabled]);
  //
  // Either accept the conditional cleanup as intentional, or risk
  // ~36% FPs on real codebases (measured: react-grab, excalidraw,
  // textarea/popover patterns). Accepting nested cleanup mirrors how
  // exhaustive-deps treats branched returns: trust the author.
  let didFindCleanupReturn = false;
  walkInsideStatementBlocks(callback.body, (child: EsTreeNode) => {
    if (didFindCleanupReturn) return;
    if (!isNodeOfType(child, "ReturnStatement")) return;
    if (isCleanupReturn(child.argument, knownBoundReleaseNames)) {
      didFindCleanupReturn = true;
    }
  });
  return didFindCleanupReturn;
};

// HACK: From "Separating Events from Effects" - when a function-typed
// prop (or local callback) is read from an effect ONLY inside a sub-
// handler (setTimeout / addEventListener / store.subscribe / etc.),
// listing it in the dep array forces the whole effect to re-synchronize
// every time its identity changes. The article's recommended fix is
// `useEffectEvent`, which is React 19+. The rule is registered as
// version-gated in `oxlint-config.ts` (USE_EFFECT_EVENT_MIN_MAJOR) so
// pre-19 projects don't see noisy diagnostics for an API they don't
// have.
//
//   function SearchInput({ onSearch }) {
//     const [query, setQuery] = useState('');
//     useEffect(() => {
//       const id = setTimeout(() => onSearch(query), 300);  // sub-handler
//       return () => clearTimeout(id);
//     }, [query, onSearch]);
//   }
//
// Detector pre-conditions (all must hold) - chosen to keep FPs near zero:
//   (1) useEffect with at least 2 dep array elements, all Identifiers
//   (2) at least one dep `F` is a function-shaped reactive value:
//         - a destructured prop named `on[A-Z]…`, OR
//         - a local declared via `const F = useCallback(...)`
//   (3) every read of `F` inside the effect body sits inside a sub-
//       handler (TIMER_AND_SCHEDULER_DIRECT_CALLEE_NAMES, OR a
//       MemberExpression whose property is in SUBSCRIPTION_METHOD_NAMES
//       - same set the prefer-use-sync-external-store family uses)
//   (4) `F` is NEVER read at the effect's own top level

export const expandTransitiveDependencies = (
  seedNames: Set<string>,
  dependencyGraph: Map<string, Set<string>>,
): Set<string> => {
  const reachable = new Set(seedNames);
  const queue: string[] = Array.from(seedNames);
  while (queue.length > 0) {
    const currentName = queue.pop();
    if (currentName === undefined) continue;
    const dependencyNames = dependencyGraph.get(currentName);
    if (!dependencyNames) continue;
    for (const dependencyName of dependencyNames) {
      if (reachable.has(dependencyName)) continue;
      reachable.add(dependencyName);
      queue.push(dependencyName);
    }
  }
  return reachable;
};

// HACK: `useEffect(() => { window.addEventListener(name, handler);
// return () => window.removeEventListener(name, handler); }, [handler])`
// is the canonical "I want the latest handler" anti-pattern: every time
// the parent re-renders with a new `handler` prop, the effect tears
// down and re-subscribes. This thrashes the listener for no reason -
// the subscription itself doesn't change, only the function it points
// to. Store the handler in a ref (`handlerRef.current = handler` in a
// separate effect or a layout effect) and have the registered listener
// read `handlerRef.current()`, then take `handler` out of the deps.
//
// Heuristic: useEffect whose dep array contains an identifier (must be
// a function-typed prop or local in practice - we approximate by
// requiring it to also appear as the second argument to
// `addEventListener`/`subscribe`-shaped calls inside the effect body).
// The shared `SUBSCRIPTION_METHOD_NAMES` set comes from `constants.ts`
// so this rule and `prefer-use-sync-external-store` agree on what
// counts as a subscription-shaped call (zustand/Redux `subscribe`,
// browser `addEventListener`, EventEmitter `on`, etc.).

export const findHookCallBindings = (
  componentBody: EsTreeNode,
): Array<{ valueName: string; hookName: string; declarator: EsTreeNode }> => {
  const bindings: Array<{ valueName: string; hookName: string; declarator: EsTreeNode }> = [];
  if (!isNodeOfType(componentBody, "BlockStatement")) return bindings;

  for (const statement of componentBody.body ?? []) {
    if (!isNodeOfType(statement, "VariableDeclaration")) continue;
    for (const declarator of statement.declarations ?? []) {
      if (!isNodeOfType(declarator.id, "Identifier")) continue;
      if (!isNodeOfType(declarator.init, "CallExpression")) continue;
      const callee = declarator.init.callee;
      if (!isNodeOfType(callee, "Identifier")) continue;
      if (!DEFERRABLE_HOOK_NAMES.has(callee.name)) continue;
      bindings.push({
        valueName: declarator.id.name,
        hookName: callee.name,
        declarator,
      });
    }
  }
  return bindings;
};

// HACK: collect names of identifiers passed as values to JSX `on*`
// attributes - these are component-bound handlers (`onClick={handleClick}`).
// Lets `isInsideEventHandler` resolve a function bound to a const back
// to its handler usage in JSX.

export const findMutableDepIssue = (
  depElement: EsTreeNode,
  useRefBindingNames: Set<string>,
): { kind: "global" | "ref-current"; rootName: string } | null => {
  if (!isNodeOfType(depElement, "MemberExpression")) return null;

  if (
    isNodeOfType(depElement.property, "Identifier") &&
    depElement.property.name === "current" &&
    !depElement.computed &&
    isNodeOfType(depElement.object, "Identifier") &&
    useRefBindingNames.has(depElement.object.name)
  ) {
    return { kind: "ref-current", rootName: depElement.object.name };
  }

  const rootName = getRootIdentifierName(depElement);
  if (rootName !== null && MUTABLE_GLOBAL_ROOTS.has(rootName)) {
    return { kind: "global", rootName };
  }
  return null;
};

// HACK: §1 of "You Might Not Need an Effect" - mirroring a prop into
// local state with a useEffect that re-syncs it. The combined shape
// is the most common form of derived-state-effect in real codebases:
//
//   function Form({ value }) {
//     const [draft, setDraft] = useState(value);
//     useEffect(() => { setDraft(value); }, [value]);
//     // ...
//   }
//
// Both `noDerivedStateEffect` and `noDerivedUseState` independently
// nudge at parts of this. This rule produces a single, more
// actionable diagnostic that names the prop and recommends deleting
// both the useState and the effect.
//
// Detector pre-conditions:
//   (1) `[X, setX] = useState(<propExpr>)` where <propExpr> is a
//       prop Identifier or a MemberExpression rooted in a prop
//   (2) `useEffect(() => setX(<propExpr'>), [<propRoot>])` where
//       <propExpr'> is structurally identical to <propExpr> from (1)
// Follow call chains so a prop-rooted method call counts:
// `useState(value.toUpperCase())` resolves to root "value". Safe for
// mirror-detection because the structural-equality check on the setter
// argument still requires the SAME call shape - it won't match
// `setX(value.toLowerCase())`.

export const findSubscribeLikeUsages = (callback: EsTreeNode): SubscribeLikeUsage[] => {
  const usages: SubscribeLikeUsage[] = [];
  // HACK: timer/subscribe calls inside the EFFECT'S CLEANUP RETURN
  // are not new registrations - they're the disposal step. The old
  // walker traversed the full callback including any returned
  // cleanup function, so a `setTimeout` inside `return () => { ... }`
  // got counted as a usage. Detect and skip the cleanup ReturnStatement's
  // argument body during the walk.
  let cleanupArgument: EsTreeNode | null = null;
  if (isNodeOfType(callback.body, "BlockStatement")) {
    const callbackStatements = callback.body.body ?? [];
    const lastCallbackStatement = callbackStatements[callbackStatements.length - 1];
    if (isNodeOfType(lastCallbackStatement, "ReturnStatement") && lastCallbackStatement.argument) {
      cleanupArgument = lastCallbackStatement.argument;
    }
  }

  walkAst(callback, (child: EsTreeNode) => {
    if (child === cleanupArgument) return false;
    if (!isNodeOfType(child, "CallExpression")) return;

    if (
      isNodeOfType(child.callee, "Identifier") &&
      TIMER_CALLEE_NAMES_REQUIRING_CLEANUP.has(child.callee.name)
    ) {
      usages.push({
        kind: "timer",
        resourceName: child.callee.name,
      });
      return;
    }

    if (
      isNodeOfType(child.callee, "MemberExpression") &&
      isNodeOfType(child.callee.property, "Identifier") &&
      SUBSCRIPTION_METHOD_NAMES.has(child.callee.property.name)
    ) {
      usages.push({
        kind: "subscribe",
        resourceName: child.callee.property.name,
      });
    }
  });
  return usages;
};

export const findSubscriptionCall = (
  effectBodyStatements: EsTreeNode[],
): { call: EsTreeNode; boundUnsubscribeName: string | null } | null => {
  for (const statement of effectBodyStatements) {
    if (isNodeOfType(statement, "VariableDeclaration")) {
      for (const declarator of statement.declarations ?? []) {
        const init = declarator.init;
        if (!isNodeOfType(init, "CallExpression")) continue;
        if (!isNodeOfType(init.callee, "MemberExpression")) continue;
        if (!isNodeOfType(init.callee.property, "Identifier")) continue;
        if (!SUBSCRIPTION_METHOD_NAMES.has(init.callee.property.name)) continue;
        const boundUnsubscribeName = isNodeOfType(declarator.id, "Identifier")
          ? declarator.id.name
          : null;
        return { call: init, boundUnsubscribeName };
      }
    }
    if (isNodeOfType(statement, "ExpressionStatement")) {
      const expression = statement.expression;
      if (!isNodeOfType(expression, "CallExpression")) continue;
      if (!isNodeOfType(expression.callee, "MemberExpression")) continue;
      if (!isNodeOfType(expression.callee.property, "Identifier")) continue;
      if (!SUBSCRIPTION_METHOD_NAMES.has(expression.callee.property.name)) continue;
      return { call: expression, boundUnsubscribeName: null };
    }
  }
  return null;
};

// HACK: `window.addEventListener("online", onChange)` is the dominant
// real-world shape - the handler is declared as a separate `const` in
// the effect body so it can be shared with `removeEventListener` in the
// cleanup. We have to resolve the Identifier argument back to its
// locally-declared arrow/function init before the structural setter
// check can run.

export const findTopLevelEffectCalls = (componentBody: EsTreeNode): EsTreeNode[] => {
  const effectCalls: EsTreeNode[] = [];
  if (!isNodeOfType(componentBody, "BlockStatement")) return effectCalls;
  for (const statement of componentBody.body ?? []) {
    if (!isNodeOfType(statement, "ExpressionStatement")) continue;
    const expression = statement.expression;
    if (!isNodeOfType(expression, "CallExpression")) continue;
    if (!isHookCall(expression, EFFECT_HOOK_NAMES)) continue;
    effectCalls.push(expression);
  }
  return effectCalls;
};

export const findTriggeredSideEffectCalleeName = (consequentNode: EsTreeNode): string | null => {
  let foundCalleeName: string | null = null;
  walkAst(consequentNode, (child: EsTreeNode) => {
    if (foundCalleeName) return false;
    if (!isNodeOfType(child, "CallExpression")) return;
    const callee = child.callee;
    if (
      isNodeOfType(callee, "Identifier") &&
      EVENT_TRIGGERED_SIDE_EFFECT_CALLEES.has(callee.name)
    ) {
      foundCalleeName = callee.name;
      return;
    }
    if (isNodeOfType(callee, "MemberExpression") && isNodeOfType(callee.property, "Identifier")) {
      const propertyName = callee.property.name;
      const isUnambiguousMethod = EVENT_TRIGGERED_SIDE_EFFECT_MEMBER_METHODS.has(propertyName);
      const isNavigationMethod = EVENT_TRIGGERED_NAVIGATION_METHOD_NAMES.has(propertyName);
      if (!isUnambiguousMethod && !isNavigationMethod) return;
      const rootName = getRootIdentifierName(callee);
      if (isNavigationMethod && (rootName === null || !NAVIGATION_RECEIVER_NAMES.has(rootName))) {
        return;
      }
      foundCalleeName = rootName ? `${rootName}.${propertyName}` : propertyName;
    }
  });
  return foundCalleeName;
};

export const findUseEffectsInComponent = (componentBody: EsTreeNode | undefined): EsTreeNode[] => {
  const effectCalls: EsTreeNode[] = [];
  if (!isNodeOfType(componentBody, "BlockStatement")) return effectCalls;
  for (const statement of componentBody.body ?? []) {
    walkAst(statement, (child: EsTreeNode) => {
      if (isNodeOfType(child, "CallExpression") && isHookCall(child, EFFECT_HOOK_NAMES)) {
        effectCalls.push(child);
      }
    });
  }
  return effectCalls;
};

export const getPropRootName = (
  expression: EsTreeNode | null | undefined,
  propNames: Set<string>,
): string | null => {
  const rootName = getRootIdentifierName(expression, { followCallChains: true });
  return rootName !== null && propNames.has(rootName) ? rootName : null;
};

export const getSingleSetterCallFromHandler = (
  handler: EsTreeNode,
): { setterName: string; setterArgument: EsTreeNode } | null => {
  const handlerStatements = getCallbackStatements(handler);
  if (handlerStatements.length !== 1) return null;
  const onlyStatement = handlerStatements[0];
  const expression = isNodeOfType(onlyStatement, "ExpressionStatement")
    ? onlyStatement.expression
    : onlyStatement;
  if (!isNodeOfType(expression, "CallExpression")) return null;
  if (!isNodeOfType(expression.callee, "Identifier")) return null;
  if (!isSetterIdentifier(expression.callee.name)) return null;
  if (!expression.arguments?.length) return null;
  return {
    setterName: expression.callee.name,
    setterArgument: expression.arguments[0],
  };
};

export const getSubscriptionHandlerArgument = (
  subscribeCall: EsTreeNode,
  effectBodyStatements: EsTreeNode[],
): EsTreeNode | null => {
  for (const argument of subscribeCall.arguments ?? []) {
    if (
      isNodeOfType(argument, "ArrowFunctionExpression") ||
      isNodeOfType(argument, "FunctionExpression")
    ) {
      return argument;
    }
    if (isNodeOfType(argument, "Identifier")) {
      for (const statement of effectBodyStatements) {
        if (!isNodeOfType(statement, "VariableDeclaration")) continue;
        for (const declarator of statement.declarations ?? []) {
          if (!isNodeOfType(declarator.id, "Identifier")) continue;
          if (declarator.id.name !== argument.name) continue;
          const init = declarator.init;
          if (
            isNodeOfType(init, "ArrowFunctionExpression") ||
            isNodeOfType(init, "FunctionExpression")
          ) {
            return init;
          }
        }
      }
    }
  }
  return null;
};

export const isSentinelIdentifier = (node: EsTreeNode): boolean =>
  isNodeOfType(node, "Identifier") && SENTINEL_IDENTIFIER_NAMES.has(node.name);

export const getTriggerGuardRootName = (testNode: EsTreeNode): string | null => {
  if (!testNode) return null;
  if (isNodeOfType(testNode, "Identifier")) return testNode.name;
  if (isNodeOfType(testNode, "BinaryExpression")) {
    if (!["!==", "===", "!=", "=="].includes(testNode.operator)) return null;
    for (const side of [testNode.left, testNode.right]) {
      if (isNodeOfType(side, "Identifier") && !isSentinelIdentifier(side)) {
        return side.name;
      }
    }
    return null;
  }
  if (
    isNodeOfType(testNode, "MemberExpression") &&
    isNodeOfType(testNode.property, "Identifier") &&
    testNode.property.name === "length"
  ) {
    if (isNodeOfType(testNode.object, "Identifier")) return testNode.object.name;
  }
  if (isNodeOfType(testNode, "UnaryExpression") && testNode.operator === "!") {
    return getTriggerGuardRootName(testNode.argument);
  }
  return null;
};

export const isFunctionShapedReturn = (returnedValue: EsTreeNode): boolean => {
  if (
    isNodeOfType(returnedValue, "ArrowFunctionExpression") ||
    isNodeOfType(returnedValue, "FunctionExpression")
  ) {
    return true;
  }
  // Returning a CallExpression result - most cleanup-returning
  // primitives (subscribe, addEventListener helpers) return a
  // function. Conservatively accept this shape.
  if (isNodeOfType(returnedValue, "CallExpression")) return true;
  // Returning a bare Identifier - could be the unsub binding from a
  // `const unsub = subscribe(...)` line. We can't statically prove
  // it's function-typed without scope analysis, but in idiomatic React
  // this is the dominant cleanup pattern. Accept.
  if (isNodeOfType(returnedValue, "Identifier")) return true;
  return false;
};

export const isExternalSyncEffect = (effectCallback: EsTreeNode): boolean => {
  // A cleanup return is the strongest signal that the effect owns
  // an external resource - once we see one, we don't need to inspect
  // the body for an external-sync call shape.
  if (isNodeOfType(effectCallback.body, "BlockStatement")) {
    const statements = effectCallback.body.body ?? [];
    for (const statement of statements) {
      if (
        isNodeOfType(statement, "ReturnStatement") &&
        statement.argument &&
        isFunctionShapedReturn(statement.argument)
      ) {
        return true;
      }
    }
  }

  let didFindExternalCall = false;
  walkAst(effectCallback, (child: EsTreeNode) => {
    if (didFindExternalCall) return false;

    if (isNodeOfType(child, "NewExpression")) {
      const constructor = child.callee;
      if (
        isNodeOfType(constructor, "Identifier") &&
        EXTERNAL_SYNC_OBSERVER_CONSTRUCTORS.has(constructor.name)
      ) {
        didFindExternalCall = true;
      }
      return;
    }

    if (isNodeOfType(child, "AssignmentExpression")) {
      if (
        isNodeOfType(child.left, "MemberExpression") &&
        isNodeOfType(child.left.property, "Identifier") &&
        child.left.property.name === "current"
      ) {
        didFindExternalCall = true;
      }
      return;
    }

    if (!isNodeOfType(child, "CallExpression")) return;

    if (
      isNodeOfType(child.callee, "Identifier") &&
      EXTERNAL_SYNC_DIRECT_CALLEE_NAMES.has(child.callee.name)
    ) {
      didFindExternalCall = true;
      return;
    }

    if (
      isNodeOfType(child.callee, "MemberExpression") &&
      isNodeOfType(child.callee.property, "Identifier")
    ) {
      const propertyName = child.callee.property.name;
      if (EXTERNAL_SYNC_MEMBER_METHOD_NAMES.has(propertyName)) {
        didFindExternalCall = true;
        return;
      }
      // HACK: `get` / `head` / `options` are HTTP verbs but also names
      // of universal data-structure methods (Map.get, URLSearchParams.get,
      // etc.). Only count them when the receiver looks like an HTTP
      // client.
      if (EXTERNAL_SYNC_AMBIGUOUS_HTTP_METHOD_NAMES.has(propertyName)) {
        const receiverRootName = getRootIdentifierName(child.callee.object);
        if (
          receiverRootName !== null &&
          EXTERNAL_SYNC_HTTP_CLIENT_RECEIVERS.has(receiverRootName)
        ) {
          didFindExternalCall = true;
        }
      }
    }
  });

  return didFindExternalCall;
};

export const isFunctionLikeNode = (node: EsTreeNode): boolean =>
  isNodeOfType(node, "FunctionDeclaration") ||
  isNodeOfType(node, "FunctionExpression") ||
  isNodeOfType(node, "ArrowFunctionExpression");

export const isUnconditionalSetterCallStatement = (
  statement: EsTreeNode,
  setterNames: ReadonlySet<string>,
): EsTreeNode | null => {
  if (!isNodeOfType(statement, "ExpressionStatement")) return null;
  const expression = statement.expression;
  if (!isNodeOfType(expression, "CallExpression")) return null;
  const callee = expression.callee;
  if (!isNodeOfType(callee, "Identifier")) return null;
  if (!setterNames.has(callee.name)) return null;
  return expression;
};

// HACK: §11 of "You Might Not Need an Effect" + the linked
// `useSyncExternalStore` docs warn that pairing a `useState(getSnapshot())`
// with a `useEffect(() => store.subscribe(() => setSnapshot(getSnapshot())))`
// reimplements `useSyncExternalStore` in user space - incorrectly.
// The hand-rolled version doesn't support concurrent rendering,
// allows tearing during transitions, and lacks server-snapshot
// support during hydration.
//
// We require a four-vertex AST match before reporting:
//
//   (1) useEffect with empty deps                   `[]`
//   (2) body declares `const u = X.subscribe(handler)` OR
//       directly invokes a subscription method      X.addEventListener(...)
//   (3) cleanup is a `return` that either returns the unsubscribe
//       binding directly OR returns a closure that unsubscribes
//   (4) handler is a single `setY(<getter>)` whose `<getter>`
//       is structurally equal to the matching useState's initializer
//
// The combined match is so specific that real-world false positives
// are essentially impossible.

export const walkComponentRespectingShadows = (
  node: EsTreeNode,
  shadowedStateNames: ReadonlySet<string>,
  visit: (child: EsTreeNode, currentlyShadowed: ReadonlySet<string>) => void,
): void => {
  if (!node || typeof node !== "object") return;

  let nextShadowedStateNames = shadowedStateNames;
  if (isFunctionLikeNode(node)) {
    const localBindings = collectFunctionLocalBindings(node);
    if (localBindings.size > 0) {
      const merged = new Set(shadowedStateNames);
      for (const localName of localBindings) merged.add(localName);
      nextShadowedStateNames = merged;
    }
  }

  visit(node, shadowedStateNames);

  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && item.type) {
          walkComponentRespectingShadows(item, nextShadowedStateNames, visit);
        }
      }
    } else if (child && typeof child === "object" && child.type) {
      walkComponentRespectingShadows(child, nextShadowedStateNames, visit);
    }
  }
};

export const NUMERIC_NAME_HINTS = ["count", "length", "total", "size", "num"];

// HACK: word-boundary aware to avoid false positives like `discount` /
// `account` matching "count" or `strength` matching "length". The hint
// must be either the entire identifier OR appear at the end with a
// case/underscore boundary (`userCount`, `user_count`, `USER_COUNT`).

export const PREVENT_DEFAULT_ELEMENTS = new Map<string, string[]>([
  ["form", ["onSubmit"]],
  ["a", ["onClick"]],
]);

export const STRING_COERCION_FUNCTIONS = new Set(["String", "Number"]);

export const SVG_PATH_ATTRIBUTES = new Set(["d", "points", "transform"]);

// HACK: SVG path strings with 4+ decimals (e.g. `M 10.293847 20.847362`)
// add bytes for sub-pixel precision the user can't see. Most editors
// emit these by default; truncating to 1-2 decimals trims 30-50% off
// markup with no visible difference.

export const SVG_PATH_HIGH_PRECISION_PATTERN = /\d+\.\d{4,}/;

export const UNCONTROLLED_INPUT_TAGS = new Set(["input", "textarea", "select"]);

// HACK: <input type="checkbox"> / "radio" use the `checked` prop to be
// controlled; `value` is just the form-submission token. <input
// type="hidden"> never needs onChange - React's runtime warning skips
// it for the same reason. Limiting our `value`-needs-onChange check to
// non-hidden, non-checkable inputs keeps us aligned with React's own
// rules.

export const VALUE_BYPASS_INPUT_TYPES = new Set(["hidden", "checkbox", "radio"]);

export const VALUE_PARTNER_ATTRIBUTES = ["onChange", "readOnly"];

export const buildPreventDefaultMessage = (elementName: string): string => {
  if (elementName === "form") {
    return "preventDefault() on <form> onSubmit - form won't work without JavaScript. Consider using a server action for progressive enhancement";
  }
  return "preventDefault() on <a> onClick - use a <button> or routing component instead";
};

export const isUseStateUndefinedInitializer = (init: EsTreeNode | null | undefined): boolean => {
  if (!init || !isNodeOfType(init, "CallExpression")) return false;
  if (!isHookCall(init, "useState")) return false;
  const callArguments = init.arguments ?? [];
  if (callArguments.length === 0) return true;
  const firstArgument = callArguments[0];
  return isNodeOfType(firstArgument, "Identifier") && firstArgument.name === "undefined";
};

export const collectUndefinedInitialStateNames = (componentBody: EsTreeNode): Set<string> => {
  const stateNames = new Set<string>();
  if (!isNodeOfType(componentBody, "BlockStatement")) return stateNames;
  for (const statement of componentBody.body ?? []) {
    if (!isNodeOfType(statement, "VariableDeclaration")) continue;
    for (const declarator of statement.declarations ?? []) {
      if (!isNodeOfType(declarator.id, "ArrayPattern")) continue;
      const valueElement = declarator.id.elements?.[0];
      if (!isNodeOfType(valueElement, "Identifier")) continue;
      if (!isUseStateUndefinedInitializer(declarator.init)) continue;
      stateNames.add(valueElement.name);
    }
  }
  return stateNames;
};

export const containsPreventDefaultCall = (node: EsTreeNode): boolean => {
  let didFindPreventDefault = false;
  walkAst(node, (child) => {
    if (didFindPreventDefault) return;
    if (
      isNodeOfType(child, "CallExpression") &&
      isNodeOfType(child.callee, "MemberExpression") &&
      isNodeOfType(child.callee.property, "Identifier") &&
      child.callee.property.name === "preventDefault"
    ) {
      didFindPreventDefault = true;
    }
  });
  return didFindPreventDefault;
};

export const extractIndexName = (node: EsTreeNode): string | null => {
  if (isNodeOfType(node, "Identifier") && INDEX_PARAMETER_NAMES.has(node.name)) return node.name;

  if (isNodeOfType(node, "TemplateLiteral")) {
    const indexExpression = node.expressions?.find(
      (expression: EsTreeNode) =>
        isNodeOfType(expression, "Identifier") && INDEX_PARAMETER_NAMES.has(expression.name),
    );
    if (indexExpression) return indexExpression.name;
  }

  if (
    isNodeOfType(node, "CallExpression") &&
    isNodeOfType(node.callee, "MemberExpression") &&
    isNodeOfType(node.callee.object, "Identifier") &&
    INDEX_PARAMETER_NAMES.has(node.callee.object.name) &&
    isNodeOfType(node.callee.property, "Identifier") &&
    node.callee.property.name === "toString"
  )
    return node.callee.object.name;

  if (
    isNodeOfType(node, "CallExpression") &&
    isNodeOfType(node.callee, "Identifier") &&
    STRING_COERCION_FUNCTIONS.has(node.callee.name) &&
    isNodeOfType(node.arguments?.[0], "Identifier") &&
    INDEX_PARAMETER_NAMES.has(node.arguments[0].name)
  )
    return node.arguments[0].name;

  if (
    isNodeOfType(node, "BinaryExpression") &&
    node.operator === "+" &&
    ((isNodeOfType(node.left, "Identifier") &&
      INDEX_PARAMETER_NAMES.has(node.left.name) &&
      isNodeOfType(node.right, "Literal") &&
      node.right.value === "") ||
      (isNodeOfType(node.right, "Identifier") &&
        INDEX_PARAMETER_NAMES.has(node.right.name) &&
        isNodeOfType(node.left, "Literal") &&
        node.left.value === ""))
  ) {
    return isNodeOfType(node.left, "Identifier") ? node.left.name : node.right.name;
  }

  return null;
};

export const getInputTypeLiteral = (attributes: EsTreeNode[]): string | null => {
  const typeAttribute = findJsxAttribute(attributes, "type");
  if (!typeAttribute || !isNodeOfType(typeAttribute.value, "Literal")) return null;
  const value = typeAttribute.value.value;
  return typeof value === "string" ? value : null;
};

export const hasJsxSpreadAttribute = (attributes: EsTreeNode[]): boolean =>
  attributes.some((attribute) => isNodeOfType(attribute, "JSXSpreadAttribute"));

// HACK: catches three uncontrolled-input mistakes that React's static
// rule set misses:
//   1. `value={...}` without `onChange` / `readOnly` - React renders
//      this as a silently read-only field at runtime.
//   2. `value` AND `defaultValue` set together - React ignores
//      defaultValue on a controlled input.
//   3. `value={state}` where `state` was initialized as undefined
//      (e.g. `useState()` with no argument) - the input starts
//      uncontrolled and flips to controlled on first set, which React
//      logs a runtime warning for.
//
// Bails when a spread attribute (`{...rest}`) is present - react-hook-form's
// `register()`, Headless UI, Radix, etc. routinely supply `onChange` /
// `defaultValue` via spread, and we can't see through it without scope
// analysis. False-negative > false-positive on a heavily used pattern.

export const isInsideStaticPlaceholderMap = (node: EsTreeNode): boolean => {
  let current = node;
  while (current.parent) {
    current = current.parent;
    if (
      isNodeOfType(current, "CallExpression") &&
      isNodeOfType(current.callee, "MemberExpression") &&
      current.callee.property?.name === "map"
    ) {
      const receiver = current.callee.object;
      if (isNodeOfType(receiver, "CallExpression")) {
        const callee = receiver.callee;
        if (
          isNodeOfType(callee, "MemberExpression") &&
          isNodeOfType(callee.object, "Identifier") &&
          callee.object.name === "Array" &&
          callee.property?.name === "from"
        )
          return true;
      }
      if (
        isNodeOfType(receiver, "NewExpression") &&
        isNodeOfType(receiver.callee, "Identifier") &&
        receiver.callee.name === "Array"
      )
        return true;
    }
  }
  return false;
};

// HACK: <button> is intentionally omitted. <button type="submit"> (the
// HTML default inside a form) has a real default action, so calling
// preventDefault() on it is legitimate. The narrow case of
// <button type="button"> would need attribute inspection plus form-scope
// detection to be reliable; out of scope until we have evidence of real
// false-negatives.
// HACK: Map (not plain object) so a JSX tag named after an
// Object.prototype property (`<constructor>`, `<toString>`) doesn't
// fall through to a truthy `Object.prototype.X` value and crash on
// `targetEventProps.includes(...)` later in the rule body.

export const isNumericName = (name: string): boolean => {
  for (const hint of NUMERIC_NAME_HINTS) {
    if (name === hint) return true;
    const camelSuffix = hint.charAt(0).toUpperCase() + hint.slice(1);
    if (name.endsWith(camelSuffix)) return true;
    if (name.endsWith(`_${hint}`)) return true;
    if (name.endsWith(`_${hint.toUpperCase()}`)) return true;
  }
  return false;
};

export {
  BOOLEAN_PROP_THRESHOLD,
  GENERIC_EVENT_SUFFIXES,
  GIANT_COMPONENT_LINE_THRESHOLD,
  RENDER_FUNCTION_PATTERN,
  RENDER_PROP_PROLIFERATION_THRESHOLD,
  BUILTIN_GLOBAL_NAMESPACE_NAMES,
  CASCADING_SET_STATE_THRESHOLD,
  EFFECT_HOOK_NAMES,
  HOOKS_WITH_DEPS,
  MUTATING_ARRAY_METHODS,
  REACT_HANDLER_PROP_PATTERN,
  RELATED_USE_STATE_THRESHOLD,
  SUBSCRIPTION_METHOD_NAMES,
  TRIVIAL_DERIVATION_CALLEE_NAMES,
  TRIVIAL_INITIALIZER_NAMES,
} from "../constants.js";
export {
  isComponentAssignment,
  isComponentDeclaration,
  isUppercaseName,
  areExpressionsStructurallyEqual,
  containsFetchCall,
  countSetStateCalls,
  createComponentBindingStackTracker,
  createComponentPropStackTracker,
  getCallbackStatements,
  getEffectCallback,
  getRootIdentifierName,
  isHookCall,
  isSetterCall,
  isSetterIdentifier,
  walkAst,
  walkInsideStatementBlocks,
  findJsxAttribute,
  isNodeOfType,
} from "../utils.js";
export type { EsTreeNode, RuleContext, Rule } from "../utils.js";
