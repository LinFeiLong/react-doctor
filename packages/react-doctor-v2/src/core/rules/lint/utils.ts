import type { Node as OxcNode } from "@oxc-project/types";
import {
  FETCH_CALLEE_NAMES,
  FETCH_MEMBER_OBJECTS,
  LOOP_TYPES,
  MUTATING_HTTP_METHODS,
  MUTATION_METHOD_NAMES,
  SETTER_PATTERN,
  UPPERCASE_PATTERN,
} from "./constants.js";

export type OxcNodeType = OxcNode["type"];

export interface EsTreeLiteralNode {
  type: "Literal";
  value?: string | number | boolean | RegExp | null;
  raw?: string;
  parent?: EsTreeNode | null;
  [key: string]: any;
}

export type EsTreeNodeType = OxcNodeType | EsTreeLiteralNode["type"];
export type OxcNodeOfType<NodeType extends OxcNodeType> = Extract<OxcNode, { type: NodeType }>;
export type EsTreeNodeOfType<NodeType extends EsTreeNodeType> = EsTreeNode & { type: NodeType };

interface ReportDescriptor {
  node: EsTreeNode;
  message: string;
}

export interface RuleContext {
  report: (descriptor: ReportDescriptor) => void;
  getFilename?: () => string;
}

export interface RuleVisitors {
  [selector: string]: ((node: EsTreeNode) => void) | (() => void);
}

export interface RuleExample {
  before: string;
  after: string;
}

export interface Rule {
  recommendation: string;
  examples?: RuleExample[];
  create: (context: RuleContext) => RuleVisitors;
}

export interface RulePlugin {
  meta: { name: string };
  rules: Record<string, Rule>;
}

export interface EsTreeNode {
  type: EsTreeNodeType;
  parent?: EsTreeNode | null;
  [key: string]: any;
}

interface ValueWithType {
  type?: unknown;
}

const hasTypeProperty = (value: unknown): value is ValueWithType =>
  Boolean(value && typeof value === "object" && "type" in value);

const isAstNode = (value: unknown): value is EsTreeNode => {
  if (!hasTypeProperty(value)) return false;
  return typeof value.type === "string";
};

export const isNodeOfType = <NodeType extends EsTreeNodeType>(
  node: unknown,
  type: NodeType,
): node is EsTreeNodeOfType<NodeType> => Boolean(hasTypeProperty(node) && node.type === type);

export interface ParsedRgb {
  red: number;
  green: number;
  blue: number;
}

interface ComponentPropStackTrackerCallbacks {
  onComponentEnter?: (componentBody: EsTreeNode | undefined) => void;
}

interface ComponentPropStackTracker {
  isPropName: (name: string) => boolean;
  getCurrentPropNames: () => Set<string>;
  visitors: RuleVisitors;
}

interface ComponentBindingStackTrackerCallbacks {
  onVariableDeclarator?: (node: EsTreeNode) => void;
}

interface ComponentBindingStackTracker {
  isInsideComponent: () => boolean;
  isBoundName: (name: string) => boolean;
  addBindingToCurrentFrame: (name: string) => void;
  visitors: RuleVisitors;
}

// HACK: AST is acyclic except for `parent` back-references, which we skip.
// Visitors may return `false` to prune the subtree below `node` (e.g. to
// stop walking into nested functions when collecting `await` expressions
// for the enclosing function only). Returning anything else (including
// `undefined`, the natural value of statements) continues the walk.
export const walkAst = (node: EsTreeNode, visitor: (child: EsTreeNode) => boolean | void): void => {
  if (!node || typeof node !== "object") return;
  if (visitor(node) === false) return;
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (isAstNode(item)) {
          walkAst(item, visitor);
        }
      }
    } else if (isAstNode(child)) {
      walkAst(child, visitor);
    }
  }
};

// HACK: variant of `walkAst` that descends through control-flow blocks
// (IfStatement / TryStatement / SwitchCase / loops / labels) but stops
// at any nested function boundary. Used by rules that ask "what runs
// SYNCHRONOUSLY inside this effect's body?" - counts the
// `if (cond) setX(...)` write but ignores the deferred
// `setTimeout(() => setX(...))` one.
//
// Unlike `walkAst`, this one does not support pruning via `false`
// return - descent is always complete except at function boundaries.
export const walkInsideStatementBlocks = (
  node: EsTreeNode,
  visitor: (child: EsTreeNode) => void,
): void => {
  if (!node || typeof node !== "object") return;
  if (
    isNodeOfType(node, "FunctionDeclaration") ||
    isNodeOfType(node, "FunctionExpression") ||
    isNodeOfType(node, "ArrowFunctionExpression")
  ) {
    return;
  }
  visitor(node);
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (isAstNode(item)) walkInsideStatementBlocks(item, visitor);
      }
    } else if (isAstNode(child)) {
      walkInsideStatementBlocks(child, visitor);
    }
  }
};

export const isSetterIdentifier = (name: string): boolean => SETTER_PATTERN.test(name);

export const isSetterCall = (node: EsTreeNode): boolean =>
  isNodeOfType(node, "CallExpression") &&
  isNodeOfType(node.callee, "Identifier") &&
  isSetterIdentifier(node.callee.name);

export const isUppercaseName = (name: string): boolean => UPPERCASE_PATTERN.test(name);

export const isMemberProperty = (node: EsTreeNode, propertyName: string): boolean =>
  isNodeOfType(node, "MemberExpression") &&
  isNodeOfType(node.property, "Identifier") &&
  node.property.name === propertyName;

// HACK: walk a MemberExpression chain (computed or not) down to the
// underlying root identifier. `state.nested.items` → "state",
// `items[0]` → "items". Returns null if the chain bottoms out at
// anything other than a plain Identifier (e.g. a CallExpression,
// `this`, etc.). Bare Identifiers also resolve to themselves.
//
// When `followCallChains` is true, also walks past the receiver of
// any intermediate CallExpression - `items.toSorted().filter(fn)` →
// "items". Off by default because most callers want the receiver of
// the call (e.g. for "did this assignment write to props?"), not the
// expression that produced the receiver.
export const getRootIdentifierName = (
  node: EsTreeNode | undefined | null,
  options?: { followCallChains?: boolean },
): string | null => {
  if (!node) return null;
  if (isNodeOfType(node, "Identifier")) return node.name;
  const followCallChains = options?.followCallChains === true;
  let cursor: EsTreeNode | undefined = node;
  while (cursor) {
    if (isNodeOfType(cursor, "MemberExpression")) {
      cursor = cursor.object;
      continue;
    }
    if (followCallChains && isNodeOfType(cursor, "CallExpression")) {
      const callee = cursor.callee;
      if (!isNodeOfType(callee, "MemberExpression")) return null;
      cursor = callee.object;
      continue;
    }
    break;
  }
  return isNodeOfType(cursor, "Identifier") ? cursor.name : null;
};

// HACK: structural equality for "value-shaped" expressions used by
// detectors that need to assert two reads of the same external value
// (e.g. `prefer-use-sync-external-store` checks that the
// `useState(getSnapshot())` initializer matches the
// `setSnapshot(getSnapshot())` inside the subscribe handler).
// Deliberately conservative - we only model Identifier / Literal /
// MemberExpression / CallExpression because any other shape
// (assignments, ternaries, template strings) shouldn't be relied on
// for a "same external store read" claim.
export const areExpressionsStructurallyEqual = (
  a: EsTreeNode | null | undefined,
  b: EsTreeNode | null | undefined,
): boolean => {
  if (!a || !b) return a === b;
  if (a.type !== b.type) return false;
  if (isNodeOfType(a, "Identifier")) return a.name === b.name;
  if (isNodeOfType(a, "Literal")) return a.value === b.value;
  if (isNodeOfType(a, "MemberExpression")) {
    if (a.computed !== b.computed) return false;
    return (
      areExpressionsStructurallyEqual(a.object, b.object) &&
      areExpressionsStructurallyEqual(a.property, b.property)
    );
  }
  if (isNodeOfType(a, "CallExpression")) {
    if (!areExpressionsStructurallyEqual(a.callee, b.callee)) return false;
    const argumentsA = a.arguments ?? [];
    const argumentsB = b.arguments ?? [];
    if (argumentsA.length !== argumentsB.length) return false;
    return argumentsA.every((argument: EsTreeNode, index: number) =>
      areExpressionsStructurallyEqual(argument, argumentsB[index]),
    );
  }
  return false;
};

export const getEffectCallback = (node: EsTreeNode): EsTreeNode | null => {
  if (!node.arguments?.length) return null;
  const callback = node.arguments[0];
  if (
    isNodeOfType(callback, "ArrowFunctionExpression") ||
    isNodeOfType(callback, "FunctionExpression")
  ) {
    return callback;
  }
  return null;
};

export const getCallbackStatements = (callback: EsTreeNode): EsTreeNode[] => {
  if (isNodeOfType(callback.body, "BlockStatement")) {
    return callback.body.body ?? [];
  }
  return callback.body ? [callback.body] : [];
};

export const countSetStateCalls = (node: EsTreeNode): number => {
  let setStateCallCount = 0;
  walkAst(node, (child) => {
    if (isSetterCall(child)) setStateCallCount++;
  });
  return setStateCallCount;
};

export const isSimpleExpression = (node: EsTreeNode | null): boolean => {
  if (!node) return false;
  switch (node.type) {
    case "Identifier":
    case "Literal":
    case "TemplateLiteral":
      return true;
    case "BinaryExpression":
      return isSimpleExpression(node.left) && isSimpleExpression(node.right);
    case "UnaryExpression":
      return isSimpleExpression(node.argument);
    case "MemberExpression":
      return !node.computed && isSimpleExpression(node.object);
    case "ConditionalExpression":
      return (
        isSimpleExpression(node.test) &&
        isSimpleExpression(node.consequent) &&
        isSimpleExpression(node.alternate)
      );
    default:
      return false;
  }
};

export const isComponentDeclaration = (node: EsTreeNode): boolean =>
  isNodeOfType(node, "FunctionDeclaration") &&
  Boolean(node.id?.name) &&
  isUppercaseName(node.id.name);

export const isComponentAssignment = (node: EsTreeNode): boolean =>
  isNodeOfType(node, "VariableDeclarator") &&
  isNodeOfType(node.id, "Identifier") &&
  isUppercaseName(node.id.name) &&
  Boolean(node.init) &&
  (isNodeOfType(node.init, "ArrowFunctionExpression") ||
    isNodeOfType(node.init, "FunctionExpression"));

export const getCalleeName = (node: EsTreeNode): string | null => {
  if (isNodeOfType(node.callee, "Identifier")) return node.callee.name;
  if (
    isNodeOfType(node.callee, "MemberExpression") &&
    isNodeOfType(node.callee.property, "Identifier")
  ) {
    return node.callee.property.name;
  }
  return null;
};

export const isHookCall = (node: EsTreeNode, hookName: string | Set<string>): boolean => {
  if (!isNodeOfType(node, "CallExpression")) return false;
  const calleeName = getCalleeName(node);
  if (!calleeName) return false;
  return typeof hookName === "string" ? calleeName === hookName : hookName.has(calleeName);
};

export const hasDirective = (programNode: EsTreeNode, directive: string): boolean =>
  Boolean(
    programNode.body?.some(
      (statement: EsTreeNode) =>
        isNodeOfType(statement, "ExpressionStatement") &&
        isNodeOfType(statement.expression, "Literal") &&
        statement.expression.value === directive,
    ),
  );

export const hasUseServerDirective = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node.body, "BlockStatement")) return false;
  return Boolean(
    node.body.body?.some(
      (statement: EsTreeNode) =>
        isNodeOfType(statement, "ExpressionStatement") && statement.directive === "use server",
    ),
  );
};

export const containsFetchCall = (node: EsTreeNode): boolean => {
  let didFindFetchCall = false;
  walkAst(node, (child) => {
    if (didFindFetchCall || !isNodeOfType(child, "CallExpression")) return;
    if (isNodeOfType(child.callee, "Identifier") && FETCH_CALLEE_NAMES.has(child.callee.name)) {
      didFindFetchCall = true;
    }
    if (
      isNodeOfType(child.callee, "MemberExpression") &&
      isNodeOfType(child.callee.object, "Identifier") &&
      FETCH_MEMBER_OBJECTS.has(child.callee.object.name)
    ) {
      didFindFetchCall = true;
    }
  });
  return didFindFetchCall;
};

export const findJsxAttribute = (
  attributes: EsTreeNode[],
  attributeName: string,
): EsTreeNode | undefined =>
  attributes?.find(
    (attribute: EsTreeNode) =>
      isNodeOfType(attribute, "JSXAttribute") &&
      isNodeOfType(attribute.name, "JSXIdentifier") &&
      attribute.name.name === attributeName,
  );

export const hasJsxAttribute = (attributes: EsTreeNode[], attributeName: string): boolean =>
  Boolean(findJsxAttribute(attributes, attributeName));

export const createLoopAwareVisitors = (
  innerVisitors: Record<string, (node: EsTreeNode) => void>,
): RuleVisitors => {
  let loopDepth = 0;
  const incrementLoopDepth = (): void => {
    loopDepth++;
  };
  const decrementLoopDepth = (): void => {
    loopDepth--;
  };

  const visitors: RuleVisitors = {};

  for (const loopType of LOOP_TYPES) {
    visitors[loopType] = incrementLoopDepth;
    visitors[`${loopType}:exit`] = decrementLoopDepth;
  }

  for (const [nodeType, handler] of Object.entries(innerVisitors)) {
    visitors[nodeType] = (node: EsTreeNode) => {
      if (loopDepth > 0) handler(node);
    };
  }

  return visitors;
};

const isCookiesOrHeadersCall = (node: EsTreeNode, methodName: string): boolean => {
  if (!isNodeOfType(node, "CallExpression") || !isNodeOfType(node.callee, "MemberExpression"))
    return false;
  const { object, property } = node.callee;
  if (!isNodeOfType(property, "Identifier") || !MUTATION_METHOD_NAMES.has(property.name))
    return false;
  if (!isNodeOfType(object, "CallExpression") || !isNodeOfType(object.callee, "Identifier"))
    return false;
  return object.callee.name === methodName;
};

const isMutatingDbCall = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node, "CallExpression") || !isNodeOfType(node.callee, "MemberExpression"))
    return false;
  const { property } = node.callee;
  return isNodeOfType(property, "Identifier") && MUTATION_METHOD_NAMES.has(property.name);
};

// HACK: extracted so `findSideEffect` can re-use the EXACT same shape
// predicate when it goes hunting for the literal method to render in
// the diagnostic. Previously `findSideEffect` used a looser `key.name
// === "method"` predicate and could pick a non-Literal `method:` entry
// (when duplicate keys are present), producing
// `"fetch() with method undefined"` in the message.
const isMutatingMethodProperty = (property: EsTreeNode): boolean =>
  isNodeOfType(property, "Property") &&
  isNodeOfType(property.key, "Identifier") &&
  property.key.name === "method" &&
  isNodeOfType(property.value, "Literal") &&
  typeof property.value.value === "string" &&
  MUTATING_HTTP_METHODS.has(property.value.value.toUpperCase());

const isMutatingFetchCall = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node, "CallExpression")) return false;
  if (!isNodeOfType(node.callee, "Identifier") || node.callee.name !== "fetch") return false;
  const optionsArgument = node.arguments?.[1];
  if (!isNodeOfType(optionsArgument, "ObjectExpression")) return false;
  return Boolean(optionsArgument.properties?.some(isMutatingMethodProperty));
};

export const findSideEffect = (node: EsTreeNode): string | null => {
  let sideEffectDescription: string | null = null;
  walkAst(node, (child: EsTreeNode) => {
    if (sideEffectDescription) return;
    if (isCookiesOrHeadersCall(child, "cookies")) {
      const methodName = child.callee.property.name;
      sideEffectDescription = `cookies().${methodName}()`;
    } else if (isCookiesOrHeadersCall(child, "headers")) {
      const methodName = child.callee.property.name;
      sideEffectDescription = `headers().${methodName}()`;
    } else if (isMutatingFetchCall(child)) {
      // HACK: re-use the EXACT predicate `isMutatingFetchCall` already
      // matched on so we can't pick a non-Literal duplicate `method:`
      // entry by mistake (a looser `key.name === "method"` predicate
      // would).
      const methodProperty = child.arguments[1].properties.find(isMutatingMethodProperty);
      sideEffectDescription = `fetch() with method ${methodProperty.value.value}`;
    } else if (isMutatingDbCall(child)) {
      const methodName = child.callee.property.name;
      const objectName = isNodeOfType(child.callee.object, "Identifier")
        ? child.callee.object.name
        : null;
      sideEffectDescription = objectName ? `${objectName}.${methodName}()` : `.${methodName}()`;
    }
  });
  return sideEffectDescription;
};

// HACK: collects every locally-bound name introduced by a parameter list,
// recursing into nested object/array patterns. We need every binding so
// `noDerivedUseState` can detect e.g. `function Foo({ user: { name } })` →
// `useState(name)` (false negative if we only added "user").
export const collectPatternNames = (pattern: EsTreeNode | null, into: Set<string>): void => {
  if (!pattern) return;

  if (isNodeOfType(pattern, "Identifier")) {
    into.add(pattern.name);
    return;
  }

  if (isNodeOfType(pattern, "AssignmentPattern")) {
    collectPatternNames(pattern.left, into);
    return;
  }

  if (isNodeOfType(pattern, "RestElement")) {
    collectPatternNames(pattern.argument, into);
    return;
  }

  if (isNodeOfType(pattern, "ArrayPattern")) {
    for (const element of pattern.elements ?? []) {
      collectPatternNames(element, into);
    }
    return;
  }

  if (isNodeOfType(pattern, "ObjectPattern")) {
    for (const property of pattern.properties ?? []) {
      if (isNodeOfType(property, "RestElement")) {
        collectPatternNames(property.argument, into);
        continue;
      }
      if (isNodeOfType(property, "Property")) {
        // The bound name lives in `property.value` (which may itself be
        // a nested pattern). The `property.key` is the source-side name
        // and only matters when it equals `property.value` (shorthand).
        collectPatternNames(property.value, into);
      }
    }
  }
};

const extractDestructuredPropNames = (params: EsTreeNode[]): Set<string> => {
  const propNames = new Set<string>();
  for (const param of params) {
    collectPatternNames(param, propNames);
  }
  return propNames;
};

// HACK: barrier-frame predicate used by `createComponentPropStackTracker`
// - a non-component arrow / function-expression VariableDeclarator
// pushes an empty stack frame so closed-over names from an outer
// component don't leak into the helper's prop check.
const isFunctionLikeVariableDeclarator = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node, "VariableDeclarator")) return false;
  return (
    isNodeOfType(node.init, "ArrowFunctionExpression") ||
    isNodeOfType(node.init, "FunctionExpression")
  );
};

// HACK: every rule that walks "what props does the enclosing component
// have?" needs the SAME prop-stack machinery - push the destructured
// param set on FunctionDeclaration / VariableDeclarator entry, push
// an empty barrier for non-component nested helpers (so closed-over
// names don't leak in), pop on exit. Four rules previously inlined
// near-identical copies of this - they now compose this tracker.
//
// `isPropName(name)` is the lookup form most rules want during a
// CallExpression visit (returns false at the first barrier).
//
// `getCurrentPropNames()` returns a snapshot - useful when the rule
// runs eagerly on component entry instead of deferring to a later
// CallExpression visit.
//
// `onComponentEnter(body)` is invoked AFTER the prop set is pushed,
// from inside the FunctionDeclaration / VariableDeclarator visitor -
// rules that compute everything once per component (e.g. mirror-prop
// detection) hook in here.
export const createComponentPropStackTracker = (
  callbacks?: ComponentPropStackTrackerCallbacks,
): ComponentPropStackTracker => {
  const propParamStack: Array<Set<string>> = [];

  const isPropName = (name: string): boolean => {
    for (let frameIndex = propParamStack.length - 1; frameIndex >= 0; frameIndex--) {
      const frame = propParamStack[frameIndex];
      if (frame.size === 0) return false;
      if (frame.has(name)) return true;
    }
    return false;
  };

  const getCurrentPropNames = (): Set<string> => {
    for (let frameIndex = propParamStack.length - 1; frameIndex >= 0; frameIndex--) {
      const frame = propParamStack[frameIndex];
      if (frame.size === 0) return new Set();
      return frame;
    }
    return new Set();
  };

  const visitors: RuleVisitors = {
    FunctionDeclaration(node: EsTreeNode) {
      if (!node.id?.name || !isUppercaseName(node.id.name)) {
        propParamStack.push(new Set());
        return;
      }
      propParamStack.push(extractDestructuredPropNames(node.params ?? []));
      callbacks?.onComponentEnter?.(node.body);
    },
    "FunctionDeclaration:exit"() {
      propParamStack.pop();
    },
    VariableDeclarator(node: EsTreeNode) {
      if (isComponentAssignment(node)) {
        propParamStack.push(extractDestructuredPropNames(node.init?.params ?? []));
        callbacks?.onComponentEnter?.(node.init?.body);
        return;
      }
      if (isFunctionLikeVariableDeclarator(node)) {
        propParamStack.push(new Set());
      }
    },
    "VariableDeclarator:exit"(node: EsTreeNode) {
      if (isComponentAssignment(node) || isFunctionLikeVariableDeclarator(node)) {
        propParamStack.pop();
      }
    },
  };

  return { isPropName, getCurrentPropNames, visitors };
};

// HACK: sibling of `createComponentPropStackTracker` for rules that need
// to track *binding* sets per component scope rather than the destructured
// prop set - e.g. `no-effect-event-in-deps` accumulates the names of
// `useEffectEvent` declarators while inside a component and then queries
// "is this dep-array identifier one of our useEffectEvent bindings?".
//
// Three rules previously reimplemented this push/pop bookkeeping inline.
// They now share the same scaffold; the per-rule predicate (e.g. "is the
// initializer a `useEffectEvent(...)` call?") lives in the
// `onVariableDeclarator` callback.
//
// The barrier semantic is intentionally simpler than the prop-stack
// tracker: the rule (e.g. `no-effect-event-in-deps`) only mutates the
// top frame for VariableDeclarators directly inside a component, and
// the stack only grows on FunctionDeclaration / VariableDeclarator
// component entries, so a closed-over name from an outer component
// can't leak in via a nested helper.
export const createComponentBindingStackTracker = (
  callbacks?: ComponentBindingStackTrackerCallbacks,
): ComponentBindingStackTracker => {
  const componentBindingStack: Array<Set<string>> = [];

  const isInsideComponent = (): boolean => componentBindingStack.length > 0;

  const isBoundName = (name: string): boolean => {
    for (let frameIndex = componentBindingStack.length - 1; frameIndex >= 0; frameIndex--) {
      if (componentBindingStack[frameIndex].has(name)) return true;
    }
    return false;
  };

  const addBindingToCurrentFrame = (name: string): void => {
    if (componentBindingStack.length === 0) return;
    componentBindingStack[componentBindingStack.length - 1].add(name);
  };

  const visitors: RuleVisitors = {
    FunctionDeclaration(node: EsTreeNode) {
      if (!node.id?.name || !isUppercaseName(node.id.name)) return;
      componentBindingStack.push(new Set());
    },
    "FunctionDeclaration:exit"(node: EsTreeNode) {
      if (!node.id?.name || !isUppercaseName(node.id.name)) return;
      componentBindingStack.pop();
    },
    VariableDeclarator(node: EsTreeNode) {
      if (isComponentAssignment(node)) {
        componentBindingStack.push(new Set());
        return;
      }
      callbacks?.onVariableDeclarator?.(node);
    },
    "VariableDeclarator:exit"(node: EsTreeNode) {
      if (isComponentAssignment(node)) componentBindingStack.pop();
    },
  };

  return { isInsideComponent, isBoundName, addBindingToCurrentFrame, visitors };
};
