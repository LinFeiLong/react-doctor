import { AUTH_FUNCTION_NAMES } from "../constants.js";
import { isNodeOfType, walkAst } from "../utils.js";
import type { EsTreeNode, RuleContext } from "../utils.js";

export const ANALYTICS_DEFERRABLE_METHODS = new Set([
  "track",
  "identify",
  "page",
  "capture",
  "captureMessage",
  "captureException",
  "log",
]);

export const ANALYTICS_DEFERRABLE_OBJECTS = new Set([
  "analytics",
  "posthog",
  "mixpanel",
  "segment",
  "amplitude",
  "datadog",
  "sentry",
]);

export const APP_ROUTER_FILE_PATTERN =
  /\/app\/(?:[^/]+\/)*(?:route|page|layout|template|loading|error|default)\.(?:tsx?|jsx?)$/;

export const CONSOLE_DEFERRABLE_METHODS = new Set(["log", "info", "warn"]);

export const DERIVING_ARRAY_METHODS = new Set(["toSorted", "toReversed", "filter", "map", "slice"]);

// HACK: passing both `<Client list={items} sortedList={items.toSorted()} />`
// (or any pair of derivations of the same source) doubles the bytes
// React serializes across the RSC wire. The client gets two copies of
// roughly the same array; one of the props is redundant. Have the
// client derive what it needs from the single source prop instead.

export const MUTABLE_CONTAINER_CONSTRUCTORS = new Set(["Map", "Set", "WeakMap", "WeakSet"]);

export const NON_PROJECT_PATH_PATTERN = /\/(?:node_modules|dist|build|\.next)\//;

export const PAGES_ROUTER_API_PATH_PATTERN = /\/pages\/api\//;

export const ROUTE_HANDLER_HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]);

export const STATIC_IO_FUNCTIONS = new Set([
  "readFileSync",
  "readFile",
  "readdir",
  "readdirSync",
  "stat",
  "statSync",
  "access",
  "accessSync",
]);

export const callReadsHandlerArgs = (call: EsTreeNode, handlerParamNames: Set<string>): boolean => {
  if (handlerParamNames.size === 0) return false;
  let referencesArg = false;
  walkAst(call, (child: EsTreeNode) => {
    if (referencesArg) return;
    if (isNodeOfType(child, "Identifier") && handlerParamNames.has(child.name)) {
      referencesArg = true;
    }
  });
  return referencesArg;
};

export const collectDeclaredNames = (declaration: EsTreeNode): Set<string> => {
  const names = new Set<string>();
  for (const declarator of declaration.declarations ?? []) {
    if (isNodeOfType(declarator.id, "Identifier")) {
      names.add(declarator.id.name);
    } else if (isNodeOfType(declarator.id, "ObjectPattern")) {
      for (const property of declarator.id.properties ?? []) {
        if (isNodeOfType(property, "Property") && isNodeOfType(property.value, "Identifier")) {
          names.add(property.value.name);
        } else if (
          isNodeOfType(property, "RestElement") &&
          isNodeOfType(property.argument, "Identifier")
        ) {
          names.add(property.argument.name);
        }
      }
    } else if (isNodeOfType(declarator.id, "ArrayPattern")) {
      for (const element of declarator.id.elements ?? []) {
        if (isNodeOfType(element, "Identifier")) names.add(element.name);
      }
    }
  }
  return names;
};

export const collectIdentifierParams = (params: EsTreeNode[]): Set<string> => {
  const names = new Set<string>();
  for (const param of params) {
    if (isNodeOfType(param, "Identifier")) names.add(param.name);
  }
  return names;
};

// HACK: route handlers run on every request - reading static assets via
// `fs.readFileSync('./fonts/...')` or `fetch(new URL('./fonts/...',
// import.meta.url))` re-reads the same file from disk per request. We
// catch BOTH App Router (`export async function GET/POST/...` in
// `app/.../route.ts`) and Pages Router (`export default async function
// handler(req, res)` in `pages/api/...`).

// HACK: in async route handlers and Server Components, two consecutive
// `await fetch()` (or any awaited calls) where the second one doesn't
// reference the first's binding is a textbook waterfall - the second
// fetch waits for the first to land before even starting, doubling
// latency. Wrap independent awaits in `Promise.all([…])` so they race.
//
// Heuristic: scan async function bodies for two consecutive
// VariableDeclaration statements whose init is `await something(...)`,
// where the second's initializer reads no identifier introduced by the
// first declaration. We require both declarations to be at the top
// level of the same block to keep precision high.

export const containsAuthCheck = (statements: EsTreeNode[]): boolean => {
  let foundAuthCall = false;
  for (const statement of statements) {
    walkAst(statement, (child: EsTreeNode) => {
      if (foundAuthCall) return;
      let callNode: EsTreeNode | null = null;
      if (isNodeOfType(child, "CallExpression")) {
        callNode = child;
      } else if (
        isNodeOfType(child, "AwaitExpression") &&
        isNodeOfType(child.argument, "CallExpression")
      ) {
        callNode = child.argument;
      }

      if (
        isNodeOfType(callNode?.callee, "Identifier") &&
        AUTH_FUNCTION_NAMES.has(callNode.callee.name)
      ) {
        foundAuthCall = true;
      }
    });
  }
  return foundAuthCall;
};

export const declarationReadsAnyName = (declaration: EsTreeNode, names: Set<string>): boolean => {
  if (names.size === 0) return false;
  let didRead = false;
  walkAst(declaration, (child: EsTreeNode) => {
    if (didRead) return;
    if (isNodeOfType(child, "Identifier") && names.has(child.name)) didRead = true;
  });
  return didRead;
};

export const declarationStartsWithAwait = (declaration: EsTreeNode): boolean => {
  for (const declarator of declaration.declarations ?? []) {
    if (isNodeOfType(declarator.init, "AwaitExpression")) return true;
  }
  return false;
};

export const getDerivingMethodName = (node: EsTreeNode): string | null => {
  if (!isNodeOfType(node, "CallExpression")) return null;
  if (!isNodeOfType(node.callee, "MemberExpression")) return null;
  if (!isNodeOfType(node.callee.property, "Identifier")) return null;
  return node.callee.property.name;
};

export const isFetchOfImportMetaUrl = (call: EsTreeNode): boolean => {
  if (!isNodeOfType(call, "CallExpression")) return false;
  if (!isNodeOfType(call.callee, "Identifier") || call.callee.name !== "fetch") return false;
  const firstArgument = call.arguments?.[0];
  if (!isNodeOfType(firstArgument, "NewExpression")) return false;
  if (!isNodeOfType(firstArgument.callee, "Identifier") || firstArgument.callee.name !== "URL")
    return false;
  const secondArgument = firstArgument.arguments?.[1];
  return (
    isNodeOfType(secondArgument, "MemberExpression") &&
    isNodeOfType(secondArgument.object, "MetaProperty") &&
    isNodeOfType(secondArgument.property, "Identifier") &&
    secondArgument.property.name === "url"
  );
};

export const isStaticIoCall = (call: EsTreeNode): boolean => {
  // fs.readFileSync(...) / fsPromises.readFile(...) / fs.promises.readFile(...).
  if (!isNodeOfType(call, "CallExpression")) return false;
  const callee = call.callee;
  if (isNodeOfType(callee, "Identifier") && STATIC_IO_FUNCTIONS.has(callee.name)) {
    return true;
  }
  if (!isNodeOfType(callee, "MemberExpression")) return false;
  const propertyName = isNodeOfType(callee.property, "Identifier") ? callee.property.name : null;
  if (!propertyName || !STATIC_IO_FUNCTIONS.has(propertyName)) return false;
  return true;
};

export const inspectHandlerBody = (
  context: RuleContext,
  handlerBody: EsTreeNode,
  handlerLabel: string,
  handlerParamNames: Set<string>,
): void => {
  walkAst(handlerBody, (child: EsTreeNode) => {
    let staticCall: EsTreeNode | null = null;
    if (isStaticIoCall(child)) staticCall = child;
    else if (isFetchOfImportMetaUrl(child)) staticCall = child;
    else if (
      isNodeOfType(child, "AwaitExpression") &&
      child.argument &&
      (isStaticIoCall(child.argument) || isFetchOfImportMetaUrl(child.argument))
    ) {
      staticCall = child.argument;
    }
    if (!staticCall) return;
    if (callReadsHandlerArgs(staticCall, handlerParamNames)) return;

    const calleeText =
      isNodeOfType(staticCall.callee, "MemberExpression") &&
      isNodeOfType(staticCall.callee.property, "Identifier")
        ? `${
            isNodeOfType(staticCall.callee.object, "Identifier")
              ? staticCall.callee.object.name
              : "?"
          }.${staticCall.callee.property.name}`
        : isNodeOfType(staticCall.callee, "Identifier")
          ? staticCall.callee.name
          : "io";
    context.report({
      node: staticCall,
      message: `${calleeText}() in ${handlerLabel} reads the same static asset every request - hoist to module scope so the read happens once at module load`,
    });
  });
};

export const isDeferrableSideEffectCall = (objectName: string, methodName: string): boolean => {
  if (objectName === "console") return CONSOLE_DEFERRABLE_METHODS.has(methodName);
  if (ANALYTICS_DEFERRABLE_OBJECTS.has(objectName)) {
    return ANALYTICS_DEFERRABLE_METHODS.has(methodName);
  }
  return false;
};

export const isFetchCall = (node: EsTreeNode): boolean => {
  if (!isNodeOfType(node, "CallExpression")) return false;
  return isNodeOfType(node.callee, "Identifier") && node.callee.name === "fetch";
};

export const isMutableConstInitializer = (init: EsTreeNode | null | undefined): string | null => {
  if (!init) return null;
  if (isNodeOfType(init, "ArrayExpression")) return "[]";
  if (isNodeOfType(init, "ObjectExpression")) return "{}";
  if (
    isNodeOfType(init, "NewExpression") &&
    isNodeOfType(init.callee, "Identifier") &&
    MUTABLE_CONTAINER_CONSTRUCTORS.has(init.callee.name)
  ) {
    return `new ${init.callee.name}()`;
  }
  return null;
};

// HACK: in `"use server"` files, mutable module-level state (let/var, OR
// const-bound mutable containers like Map/Set/WeakMap/Array) is shared
// across concurrent requests. Different users can read each other's data,
// and serverless cold-starts produce inconsistent state. Per-request data
// must live inside the action, in headers/cookies, or in a request scope
// (React.cache, AsyncLocalStorage, etc.).

// HACK: `cache(fn)` from React keys deduplication on REFERENCE equality
// of the function arguments. Calling the cached function with object
// literals (`getUser({ id: 1 })` then `getUser({ id: 1 })`) creates two
// distinct argument objects per render, so the cache never hits and the
// underlying fetch runs twice per request. Pass primitives (or memoize
// the argument object once at module/route scope).

// HACK: a (object, method) pair counts as "deferrable side effect" when
// it either (a) is a synchronous `console.log/info/warn` (still cheap,
// but the historical behavior of this rule and a real concern when many
// log lines pile up), or (b) is a known analytics/telemetry SDK method
// that genuinely costs a network round trip and IS worth wrapping in
// `after()` so it doesn't delay the user-visible response. Add provider
// names to the analytics object set as new SDKs come up.

export const objectExpressionHasNextRevalidate = (objectExpression: EsTreeNode): boolean => {
  if (!isNodeOfType(objectExpression, "ObjectExpression")) return false;
  for (const property of objectExpression.properties ?? []) {
    if (!isNodeOfType(property, "Property")) continue;
    if (!isNodeOfType(property.key, "Identifier")) continue;
    if (property.key.name === "cache") return true;
    if (property.key.name !== "next") continue;
    if (!isNodeOfType(property.value, "ObjectExpression")) return true;
    for (const innerProperty of property.value.properties ?? []) {
      if (!isNodeOfType(innerProperty, "Property")) continue;
      if (!isNodeOfType(innerProperty.key, "Identifier")) continue;
      if (innerProperty.key.name === "revalidate" || innerProperty.key.name === "tags") {
        return true;
      }
    }
    return true;
  }
  return false;
};
export { AUTH_CHECK_LOOKAHEAD_STATEMENTS } from "../constants.js";
export {
  getRootIdentifierName,
  hasDirective,
  hasUseServerDirective,
  isNodeOfType,
} from "../utils.js";
export type { EsTreeNode, RuleContext, Rule } from "../utils.js";
