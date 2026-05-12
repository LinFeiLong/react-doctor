import { walkAst, isSimpleExpression, isNodeOfType } from "../utils.js";
import type { EsTreeNode, RuleContext } from "../utils.js";

export const CONTINUOUS_VALUE_HOOK_PATTERN =
  /^use(?:Window(?:Width|Height|Dimensions)|Scroll(?:Position|Y|X)|MousePosition|ResizeObserver|IntersectionObserver)/;

// HACK: hooks that return a continuously-changing numeric value
// (`useWindowWidth`, `useScrollPosition`, etc.) trigger a re-render on
// every change. If the component only cares about a coarser boolean
// derived from that value (`width < 768` → "is mobile"), it ends up
// rendering on every pixel of resize. Use a media-query / threshold
// hook (`useMediaQuery("(max-width: 767px)")`) which only fires when
// the threshold flips.
//
// Heuristic: `const x = useFooBar(...)` immediately followed by a
// `const y = x [<>=] literal` (or boolean expression on x), where y is
// the only value referenced in the JSX.

export const HIGH_FREQUENCY_DOM_EVENTS = new Set([
  "scroll",
  "mousemove",
  "wheel",
  "pointermove",
  "touchmove",
  "drag",
]);

export const NONDETERMINISTIC_RENDER_PATTERNS: Array<{
  matches: (node: EsTreeNode) => boolean;
  display: string;
}> = [
  {
    display: "new Date()",
    matches: (node) =>
      isNodeOfType(node, "NewExpression") &&
      isNodeOfType(node.callee, "Identifier") &&
      node.callee.name === "Date",
  },
  {
    display: "Date.now()",
    matches: (node) =>
      isNodeOfType(node, "CallExpression") &&
      isNodeOfType(node.callee, "MemberExpression") &&
      isNodeOfType(node.callee.object, "Identifier") &&
      node.callee.object.name === "Date" &&
      isNodeOfType(node.callee.property, "Identifier") &&
      node.callee.property.name === "now",
  },
  {
    display: "Math.random()",
    matches: (node) =>
      isNodeOfType(node, "CallExpression") &&
      isNodeOfType(node.callee, "MemberExpression") &&
      isNodeOfType(node.callee.object, "Identifier") &&
      node.callee.object.name === "Math" &&
      isNodeOfType(node.callee.property, "Identifier") &&
      node.callee.property.name === "random",
  },
  {
    display: "performance.now()",
    matches: (node) =>
      isNodeOfType(node, "CallExpression") &&
      isNodeOfType(node.callee, "MemberExpression") &&
      isNodeOfType(node.callee.object, "Identifier") &&
      node.callee.object.name === "performance" &&
      isNodeOfType(node.callee.property, "Identifier") &&
      node.callee.property.name === "now",
  },
  {
    display: "crypto.randomUUID()",
    matches: (node) =>
      isNodeOfType(node, "CallExpression") &&
      isNodeOfType(node.callee, "MemberExpression") &&
      isNodeOfType(node.callee.object, "Identifier") &&
      node.callee.object.name === "crypto" &&
      isNodeOfType(node.callee.property, "Identifier") &&
      node.callee.property.name === "randomUUID",
  },
];

export const callbackReturnsJsx = (callback: EsTreeNode | undefined): boolean => {
  if (!callback) return false;
  if (
    !isNodeOfType(callback, "ArrowFunctionExpression") &&
    !isNodeOfType(callback, "FunctionExpression")
  ) {
    return false;
  }
  const body = callback.body;
  if (isNodeOfType(body, "JSXElement") || isNodeOfType(body, "JSXFragment")) return true;
  if (!isNodeOfType(body, "BlockStatement")) return false;
  for (const stmt of body.body ?? []) {
    if (
      isNodeOfType(stmt, "ReturnStatement") &&
      (isNodeOfType(stmt.argument, "JSXElement") || isNodeOfType(stmt.argument, "JSXFragment"))
    ) {
      return true;
    }
  }
  return false;
};

export const collectIdentifierNames = (
  node: EsTreeNode | null | undefined,
  into: Set<string>,
): void => {
  if (!node) return;
  walkAst(node, (child: EsTreeNode) => {
    if (isNodeOfType(child, "Identifier")) into.add(child.name);
  });
};

export const containsEarlyReturn = (ifStatement: EsTreeNode): boolean => {
  const consequent = ifStatement.consequent;
  if (!consequent) return false;
  if (isNodeOfType(consequent, "ReturnStatement")) return true;
  if (!isNodeOfType(consequent, "BlockStatement")) return false;
  for (const stmt of consequent.body ?? []) {
    if (isNodeOfType(stmt, "ReturnStatement")) return true;
  }
  return false;
};

// HACK: `useMemo(() => <jsx/>)` followed by an early return wastes the
// memoization - the useMemo callback runs every render even when the
// component bails out (loading, gated, etc.). Better to extract the JSX
// into a memoized child component so the parent's early return
// short-circuits before the child renders.

export const findOpeningElementOfChild = (jsxNode: EsTreeNode): EsTreeNode | null => {
  let cursor: EsTreeNode | null = jsxNode.parent ?? null;
  while (cursor) {
    if (isNodeOfType(cursor, "JSXElement")) return cursor.openingElement;
    if (isNodeOfType(cursor, "JSXFragment")) return null;
    cursor = cursor.parent ?? null;
  }
  return null;
};

export const isThresholdComparison = (node: EsTreeNode, valueName: string): boolean => {
  if (!isNodeOfType(node, "BinaryExpression")) return false;
  if (!["<", "<=", ">", ">=", "===", "!==", "==", "!="].includes(node.operator)) return false;
  const referencesContinuous =
    (isNodeOfType(node.left, "Identifier") && node.left.name === valueName) ||
    (isNodeOfType(node.right, "Identifier") && node.right.name === valueName);
  if (!referencesContinuous) return false;
  return isNodeOfType(node.left, "Literal") || isNodeOfType(node.right, "Literal");
};

export const findThresholdDerivedBindings = (
  componentBody: EsTreeNode,
): Array<{ continuousName: string; hookName: string; declarator: EsTreeNode }> => {
  const out: Array<{ continuousName: string; hookName: string; declarator: EsTreeNode }> = [];
  if (!isNodeOfType(componentBody, "BlockStatement")) return out;
  const statements = componentBody.body ?? [];

  for (let outerIndex = 0; outerIndex < statements.length; outerIndex++) {
    const outerStatement = statements[outerIndex];
    if (!isNodeOfType(outerStatement, "VariableDeclaration")) continue;

    for (const declarator of outerStatement.declarations ?? []) {
      if (!isNodeOfType(declarator.id, "Identifier")) continue;
      const init = declarator.init;
      if (!isNodeOfType(init, "CallExpression")) continue;
      if (!isNodeOfType(init.callee, "Identifier")) continue;
      if (!CONTINUOUS_VALUE_HOOK_PATTERN.test(init.callee.name)) continue;

      const continuousName = declarator.id.name;
      const hookName = init.callee.name;

      // Look at the next statement(s) for a derived threshold binding.
      for (let innerIndex = outerIndex + 1; innerIndex < statements.length; innerIndex++) {
        const innerStatement = statements[innerIndex];
        if (!isNodeOfType(innerStatement, "VariableDeclaration")) break;
        let foundThreshold = false;
        for (const innerDecl of innerStatement.declarations ?? []) {
          if (innerDecl.init && isThresholdComparison(innerDecl.init, continuousName)) {
            foundThreshold = true;
            break;
          }
        }
        if (foundThreshold) {
          out.push({ continuousName, hookName, declarator });
          break;
        }
      }
    }
  }
  return out;
};

export const handlerCallsSetState = (handler: EsTreeNode): EsTreeNode | null => {
  if (
    !isNodeOfType(handler, "ArrowFunctionExpression") &&
    !isNodeOfType(handler, "FunctionExpression")
  ) {
    return null;
  }
  let setStateCall: EsTreeNode | null = null;
  walkAst(handler.body, (child: EsTreeNode) => {
    if (setStateCall) return;
    if (
      isNodeOfType(child, "CallExpression") &&
      isNodeOfType(child.callee, "Identifier") &&
      /^set[A-Z]/.test(child.callee.name)
    ) {
      setStateCall = child;
    }
  });
  return setStateCall;
};

// HACK: scroll, mousemove, wheel, pointermove, and similar high-frequency
// DOM events fire dozens to hundreds of times per second. Calling
// `setState` from these handlers triggers a re-render on every event,
// pegging the JS thread and causing the user-visible jank these
// listeners were trying to react to. Use `useTransition`/`startTransition`
// to mark the update as non-urgent (so the browser can interrupt it for
// input), or stash the value in a ref + raf throttle, or use
// `useDeferredValue`.

// HACK: rendering `new Date()`, `Date.now()`, `Math.random()`, etc.
// directly inside JSX produces a different value on the server vs the
// client. Real fixes keep server HTML stable, then fill the dynamic value
// from a client-only boundary.

export const hasSuppressHydrationWarningAttribute = (
  openingElement: EsTreeNode | null,
): boolean => {
  if (!openingElement) return false;
  for (const attribute of openingElement.attributes ?? []) {
    if (
      isNodeOfType(attribute, "JSXAttribute") &&
      isNodeOfType(attribute.name, "JSXIdentifier") &&
      attribute.name.name === "suppressHydrationWarning"
    ) {
      return true;
    }
  }
  return false;
};

export const isAddEventListenerCall = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node, "CallExpression")) return false;
  if (!isNodeOfType(node.callee, "MemberExpression")) return false;
  if (!isNodeOfType(node.callee.property, "Identifier")) return false;
  if (node.callee.property.name !== "addEventListener") return false;
  return true;
};

export const isEarlyReturnIfStatement = (statement: EsTreeNode): boolean => {
  if (!isNodeOfType(statement, "IfStatement")) return false;
  const consequent = statement.consequent;
  if (!consequent) return false;
  if (isNodeOfType(consequent, "ReturnStatement")) return true;
  if (!isNodeOfType(consequent, "BlockStatement")) return false;
  for (const inner of consequent.body ?? []) {
    if (isNodeOfType(inner, "ReturnStatement")) return true;
  }
  return false;
};

// HACK: `const x = await something(); if (skip) return defaultValue;` -
// the early-return doesn't depend on the awaited value, so the await
// blocked the function for nothing on the skip path. Move the await
// after the cheap synchronous guard so we only pay the latency when we
// actually need the data.
//
// Heuristic: an awaited VariableDeclaration immediately followed by an
// IfStatement whose test references no identifiers from the awaited
// declaration. We require the if to be the very next statement to
// stay precise (intervening statements would imply the awaited binding
// is being prepared for use).

export const isInlineReference = (node: EsTreeNode): string | null => {
  if (
    isNodeOfType(node, "ArrowFunctionExpression") ||
    isNodeOfType(node, "FunctionExpression") ||
    (isNodeOfType(node, "CallExpression") &&
      isNodeOfType(node.callee, "MemberExpression") &&
      node.callee.property?.name === "bind")
  )
    return "functions";

  if (isNodeOfType(node, "ObjectExpression")) return "objects";
  if (isNodeOfType(node, "ArrayExpression")) return "Arrays";
  if (isNodeOfType(node, "JSXElement") || isNodeOfType(node, "JSXFragment")) return "JSX";

  return null;
};

// Identifiers and member-access chains are technically "simple", but memoizing
// them is sometimes intentional (stable reference passing). Only flag arithmetic
// / literal trivial cases to keep false positives low.

export const isMemoCall = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node, "CallExpression")) return false;
  if (isNodeOfType(node.callee, "Identifier") && node.callee.name === "memo") return true;
  if (
    isNodeOfType(node.callee, "MemberExpression") &&
    isNodeOfType(node.callee.object, "Identifier") &&
    node.callee.object.name === "React" &&
    isNodeOfType(node.callee.property, "Identifier") &&
    node.callee.property.name === "memo"
  )
    return true;
  return false;
};

export const isMotionElement = (attributeNode: EsTreeNode): boolean => {
  const openingElement = attributeNode.parent;
  if (!openingElement || !isNodeOfType(openingElement, "JSXOpeningElement")) return false;

  const elementName = openingElement.name;
  if (
    isNodeOfType(elementName, "JSXMemberExpression") &&
    isNodeOfType(elementName.object, "JSXIdentifier") &&
    (elementName.object.name === "motion" || elementName.object.name === "m")
  )
    return true;

  if (isNodeOfType(elementName, "JSXIdentifier") && elementName.name.startsWith("Motion"))
    return true;

  return false;
};

// HACK: detect static JSX declared inside a component body - anything like
// `const Header = <h1>Hi</h1>` inside a render function gets recreated on
// every render. If the JSX has no expression containers referencing local
// scope (no props, no state), it can be hoisted to module scope.

export const isTriviallyCheapExpression = (node: EsTreeNode | null): boolean => {
  if (!node) return false;
  if (!isSimpleExpression(node)) return false;
  if (isNodeOfType(node, "Identifier")) return false;
  if (isNodeOfType(node, "MemberExpression")) return false;
  return true;
};

export const jsxReferencesLocalScope = (jsxNode: EsTreeNode): boolean => {
  let referencesScope = false;
  walkAst(jsxNode, (child: EsTreeNode) => {
    if (referencesScope) return;
    if (
      isNodeOfType(child, "JSXExpressionContainer") &&
      !isNodeOfType(child.expression, "JSXEmptyExpression")
    ) {
      referencesScope = true;
    }
    if (isNodeOfType(child, "JSXSpreadAttribute")) {
      referencesScope = true;
    }
  });
  return referencesScope;
};

export const INTL_CLASSES = new Set([
  "NumberFormat",
  "DateTimeFormat",
  "Collator",
  "RelativeTimeFormat",
  "ListFormat",
  "PluralRules",
  "Segmenter",
  "DisplayNames",
]);

export const ITERATION_METHOD_NAMES_WITH_CALLBACK = new Set([
  "forEach",
  "map",
  "filter",
  "reduce",
  "reduceRight",
  "find",
  "findIndex",
  "some",
  "every",
  "flatMap",
]);

// HACK: `await Promise.all(items.map(async item => { await fetch(item); }))`
// is the canonical PARALLEL-async pattern - not a bug. The async callbacks
// produce an array of promises that `Promise.all` (and friends) await
// concurrently. Don't flag `.map` (or `.flatMap`) when its result flows
// directly into one of the concurrency combinators. We only recognise
// direct member calls (`Promise.all(...)`) since that's how 99% of code
// writes it; `Promise["all"](...)` etc. are rare enough to accept.

export const PROMISE_CONCURRENCY_METHODS = new Set(["all", "allSettled", "race", "any"]);

export const buildMemberAccessKey = (node: EsTreeNode): string | null => {
  if (isNodeOfType(node, "Identifier")) return node.name;
  if (isNodeOfType(node, "ThisExpression")) return "this";
  if (!isNodeOfType(node, "MemberExpression") || node.computed) return null;
  const objectKey = buildMemberAccessKey(node.object);
  if (!objectKey) return null;
  if (!isNodeOfType(node.property, "Identifier")) return null;
  return `${objectKey}.${node.property.name}`;
};

// HACK: detect repeated deep `obj.a.b.c` reads inside the same loop -
// JS engines can sometimes optimize, but reads through proxies, getters,
// or hot user-code paths often benefit from caching the access in a const
// at the top of the loop body. We require a member-expression depth ≥ 2
// (two dots) and ≥ 3 occurrences in the same loop block to fire.

// HACK: when comparing two arrays element-by-element via .every / .some /
// .reduce against another array, a length mismatch is the cheapest possible
// shortcut. e.g. `a.length === b.length && a.every((x, i) => x === b[i])`
// runs the every-loop only when lengths match.

// HACK: `new Intl.NumberFormat()` / `Intl.DateTimeFormat()` is expensive
// (dozens of allocations per locale lookup). Allocating it inside a render
// function or hot loop tanks scroll/list perf. Hoist to module scope or
// wrap in useMemo.

export const findFirstAwaitOutsideNestedFunctions = (block: EsTreeNode): EsTreeNode | null => {
  let firstAwait: EsTreeNode | null = null;
  walkAst(block, (child: EsTreeNode): boolean | void => {
    if (firstAwait) return false;
    if (
      child !== block &&
      (isNodeOfType(child, "FunctionDeclaration") ||
        isNodeOfType(child, "FunctionExpression") ||
        isNodeOfType(child, "ArrowFunctionExpression"))
    ) {
      // Don't descend into nested functions - their `await`s belong to
      // their own async parent, not this loop. (`child !== block` so we
      // still walk the body of the loop callback itself when called with
      // the callback's body.)
      return false;
    }
    if (isNodeOfType(child, "AwaitExpression")) {
      firstAwait = child;
    }
  });
  return firstAwait;
};

// HACK: `for (const x of items) { await fetch(x); }` runs the fetches
// sequentially - each one waits for the previous to finish before
// starting. If the calls are independent (which they almost always are
// in a list-iteration loop), the total latency is N × per-call latency
// instead of just per-call. `await Promise.all(items.map(fetch))` runs
// them all concurrently. We flag any `await` inside `for…of`,
// `for…in`, classic `for`, `while`, or `.forEach`/`.map` callback
// bodies where `await` appears at the top level of the loop body.
//
// Notable exceptions we INTENTIONALLY do not exempt:
//  - `for await (const x of asyncIterable)` - that's a different
//    AST node (ForOfStatement with `await: true`); we skip those.
//  - Loops where the next iteration depends on the previous result
//    (e.g. paginated fetch). The plugin can't tell - accept some
//    false positives in exchange for catching the common waterfall.

export const isFunctionishExpression = (node: EsTreeNode): boolean =>
  isNodeOfType(node, "ArrowFunctionExpression") || isNodeOfType(node, "FunctionExpression");

export const isIntlNewExpression = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node, "NewExpression")) return false;
  const callee = node.callee;
  if (
    isNodeOfType(callee, "MemberExpression") &&
    isNodeOfType(callee.object, "Identifier") &&
    callee.object.name === "Intl" &&
    isNodeOfType(callee.property, "Identifier") &&
    INTL_CLASSES.has(callee.property.name)
  ) {
    return true;
  }
  return false;
};

export const isWrappedInPromiseConcurrency = (mapCall: EsTreeNode): boolean => {
  const parent = mapCall.parent;
  if (!isNodeOfType(parent, "CallExpression")) return false;
  if (parent.arguments?.[0] !== mapCall) return false;
  const callee = parent.callee;
  if (!isNodeOfType(callee, "MemberExpression") || callee.computed) return false;
  if (!isNodeOfType(callee.object, "Identifier") || callee.object.name !== "Promise") return false;
  if (!isNodeOfType(callee.property, "Identifier")) return false;
  return PROMISE_CONCURRENCY_METHODS.has(callee.property.name);
};

export const reportIfIndependent = (statements: EsTreeNode[], context: RuleContext): void => {
  const declaredNames = new Set<string>();

  for (const statement of statements) {
    if (!isNodeOfType(statement, "VariableDeclaration")) continue;
    const declarator = statement.declarations[0];
    const awaitArgument = declarator.init?.argument;

    let referencesEarlierResult = false;
    walkAst(awaitArgument, (child: EsTreeNode) => {
      if (isNodeOfType(child, "Identifier") && declaredNames.has(child.name)) {
        referencesEarlierResult = true;
      }
    });

    if (referencesEarlierResult) return;

    if (isNodeOfType(declarator.id, "Identifier")) {
      declaredNames.add(declarator.id.name);
    }
  }

  context.report({
    node: statements[0],
    message: `${statements.length} sequential await statements that appear independent - use Promise.all() for parallel execution`,
  });
};

// HACK: keys that store JSON-serialized objects in localStorage /
// sessionStorage live forever and often outlast the JavaScript that
// wrote them. When you change the stored shape (rename a field, switch
// encoding, etc.), old code in existing browsers reads the new format
// and either crashes or silently loses data. Versioning the key
// (`prefs:v1`, `cache@1`, etc.) means a schema change just reads from a
// new key, leaving the old one to either migrate cleanly or be ignored.
//
// Heuristic: flag only when the *value* is a `JSON.stringify(...)` call
// - those are the cases where schema versioning matters. Simple flags
// like `setItem("count", "5")` don't need versioning and would be noise.

export const VERSIONED_KEY_PATTERN = /(?:[._:-]v\d+|@\d+|\bv\d+\b)/i;

export const isJsonStringifyCall = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node, "CallExpression")) return false;
  if (!isNodeOfType(node.callee, "MemberExpression")) return false;
  if (!isNodeOfType(node.callee.object, "Identifier")) return false;
  if (node.callee.object.name !== "JSON") return false;
  if (!isNodeOfType(node.callee.property, "Identifier")) return false;
  return node.callee.property.name === "stringify";
};

export {
  ANIMATION_CALLBACK_NAMES,
  BLUR_VALUE_PATTERN,
  EFFECT_HOOK_NAMES,
  EXECUTABLE_SCRIPT_TYPES,
  LARGE_BLUR_THRESHOLD_PX,
  LAYOUT_PROPERTIES,
  LOADING_STATE_PATTERN,
  MOTION_ANIMATE_PROPS,
  SCRIPT_LOADING_ATTRIBUTES,
  CHAINABLE_ITERATION_METHODS,
  DEEP_NESTING_THRESHOLD,
  DUPLICATE_STORAGE_READ_THRESHOLD,
  PROPERTY_ACCESS_REPEAT_THRESHOLD,
  SEQUENTIAL_AWAIT_THRESHOLD,
  STORAGE_OBJECTS,
  TEST_FILE_PATTERN,
  BARREL_INDEX_SUFFIXES,
  HEAVY_LIBRARIES,
  PASSIVE_EVENT_NAMES,
} from "../constants.js";
export {
  getEffectCallback,
  isComponentAssignment,
  isHookCall,
  isMemberProperty,
  isSetterCall,
  isUppercaseName,
  walkAst,
  createLoopAwareVisitors,
  isNodeOfType,
  findJsxAttribute,
  hasJsxAttribute,
} from "../utils.js";
export type { EsTreeNode, RuleContext, Rule } from "../utils.js";
