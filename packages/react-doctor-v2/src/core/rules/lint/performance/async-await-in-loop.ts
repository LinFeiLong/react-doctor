import { defineRule } from "../../registry.js";
import {
  ITERATION_METHOD_NAMES_WITH_CALLBACK,
  TEST_OR_INFRA_FILE_PATTERN,
  findFirstAwaitOutsideNestedFunctions,
  isFunctionishExpression,
  isWrappedInPromiseConcurrency,
  walkAst,
  isNodeOfType,
} from "./utils/index.js";
import type { EsTreeNode, Rule, RuleContext } from "./utils/index.js";

const SLEEP_LIKE_FUNCTION_NAMES: ReadonlySet<string> = new Set([
  "sleep",
  "delay",
  "wait",
  "setTimeout",
  "pause",
  "throttle",
]);

const isNestedFunction = (node: EsTreeNode): boolean =>
  isFunctionishExpression(node) || isNodeOfType(node, "FunctionDeclaration");

const isAwaitingSleepLikeCall = (awaitNode: EsTreeNode): boolean => {
  const argument = awaitNode.argument;
  if (!isNodeOfType(argument, "CallExpression")) return false;
  if (
    isNodeOfType(argument.callee, "Identifier") &&
    SLEEP_LIKE_FUNCTION_NAMES.has(argument.callee.name)
  ) {
    return true;
  }
  return (
    isNodeOfType(argument.callee, "MemberExpression") &&
    isNodeOfType(argument.callee.property, "Identifier") &&
    SLEEP_LIKE_FUNCTION_NAMES.has(argument.callee.property.name)
  );
};

const collectPatternIdentifierNames = (
  pattern: EsTreeNode | null | undefined,
  identifierNames: Set<string>,
): void => {
  if (!pattern) return;
  if (isNodeOfType(pattern, "Identifier")) {
    identifierNames.add(pattern.name);
    return;
  }
  if (isNodeOfType(pattern, "ObjectPattern")) {
    for (const property of pattern.properties ?? []) {
      if (isNodeOfType(property, "Property")) {
        collectPatternIdentifierNames(property.value, identifierNames);
      } else if (isNodeOfType(property, "RestElement")) {
        collectPatternIdentifierNames(property.argument, identifierNames);
      }
    }
    return;
  }
  if (isNodeOfType(pattern, "ArrayPattern")) {
    for (const element of pattern.elements ?? []) {
      collectPatternIdentifierNames(element, identifierNames);
    }
    return;
  }
  if (isNodeOfType(pattern, "AssignmentPattern")) {
    collectPatternIdentifierNames(pattern.left, identifierNames);
  }
};

const collectAssignedIdentifierNames = (node: EsTreeNode): Set<string> => {
  const assignedIdentifierNames = new Set<string>();
  walkAst(node, (child: EsTreeNode): boolean | void => {
    if (isNestedFunction(child)) return false;
    if (isNodeOfType(child, "AssignmentExpression")) {
      collectPatternIdentifierNames(child.left, assignedIdentifierNames);
    }
    if (isNodeOfType(child, "VariableDeclarator") && isNodeOfType(child.init, "AwaitExpression")) {
      collectPatternIdentifierNames(child.id, assignedIdentifierNames);
    }
  });
  return assignedIdentifierNames;
};

const collectAwaitedArgumentIdentifierNames = (node: EsTreeNode): Set<string> => {
  const awaitedArgumentIdentifierNames = new Set<string>();
  walkAst(node, (child: EsTreeNode): boolean | void => {
    if (isNestedFunction(child)) return false;
    if (!isNodeOfType(child, "AwaitExpression") || !child.argument) return;
    walkAst(child.argument, (innerChild: EsTreeNode) => {
      if (isNodeOfType(innerChild, "Identifier")) {
        awaitedArgumentIdentifierNames.add(innerChild.name);
      }
      if (
        isNodeOfType(innerChild, "MemberExpression") &&
        isNodeOfType(innerChild.object, "Identifier")
      ) {
        awaitedArgumentIdentifierNames.add(innerChild.object.name);
      }
    });
  });
  return awaitedArgumentIdentifierNames;
};

const hasLoopCarriedDependency = (node: EsTreeNode): boolean => {
  const assignedIdentifierNames = collectAssignedIdentifierNames(node);
  if (assignedIdentifierNames.size === 0) return false;
  const awaitedArgumentIdentifierNames = collectAwaitedArgumentIdentifierNames(node);
  for (const identifierName of assignedIdentifierNames) {
    if (awaitedArgumentIdentifierNames.has(identifierName)) return true;
  }
  return false;
};

const loopBodyHasOnlySleepLikeAwaits = (node: EsTreeNode): boolean => {
  let hasAwait = false;
  let allAwaitsAreSleepLike = true;
  walkAst(node, (child: EsTreeNode): boolean | void => {
    if (isNestedFunction(child)) return false;
    if (!isNodeOfType(child, "AwaitExpression")) return;
    hasAwait = true;
    if (!isAwaitingSleepLikeCall(child)) allAwaitsAreSleepLike = false;
  });
  return hasAwait && allAwaitsAreSleepLike;
};

export const asyncAwaitInLoop = defineRule<Rule>({
  recommendation:
    "Start independent async operations before the loop or collect promises and await Promise.all when iterations do not depend on each other.",
  examples: [
    {
      before: `for (const id of ids) { results.push(await load(id)); }`,
      after: `const results = await Promise.all(ids.map(load));`,
    },
  ],
  create: (context: RuleContext) => {
    const filename = context.getFilename?.() ?? "";
    const isTestOrInfraFile = TEST_OR_INFRA_FILE_PATTERN.test(filename);

    const inspectLoopBody = (loopBody: EsTreeNode | null | undefined, label: string): void => {
      if (isTestOrInfraFile) return;
      if (!loopBody) return;
      if (loopBodyHasOnlySleepLikeAwaits(loopBody)) return;
      if (hasLoopCarriedDependency(loopBody)) return;
      const firstAwait = findFirstAwaitOutsideNestedFunctions(loopBody);
      if (firstAwait) {
        context.report({
          node: firstAwait,
          message: `await inside a ${label} runs the calls sequentially - for independent operations, collect them and use \`await Promise.all(items.map(...))\` to run them concurrently`,
        });
      }
    };

    return {
      ForStatement(node: EsTreeNode) {
        inspectLoopBody(node.body, "for-loop");
      },
      ForInStatement(node: EsTreeNode) {
        inspectLoopBody(node.body, "for…in loop");
      },
      ForOfStatement(node: EsTreeNode) {
        // `for await (const x of …)` is the legitimate async-iterator
        // pattern - skip it.
        if (node.await) return;
        inspectLoopBody(node.body, "for…of loop");
      },
      WhileStatement(node: EsTreeNode) {
        inspectLoopBody(node.body, "while-loop");
      },
      DoWhileStatement(node: EsTreeNode) {
        inspectLoopBody(node.body, "do-while loop");
      },
      CallExpression(node: EsTreeNode) {
        if (isTestOrInfraFile) return;
        // arr.forEach(async item => { await fn(item); }) - sequential
        // because forEach doesn't await; even worse, the awaits are
        // dropped on the floor (forEach ignores return values).
        if (!isNodeOfType(node.callee, "MemberExpression")) return;
        if (!isNodeOfType(node.callee.property, "Identifier")) return;
        const methodName = node.callee.property.name;
        if (!ITERATION_METHOD_NAMES_WITH_CALLBACK.has(methodName)) return;

        const callback = node.arguments?.[0];
        if (!callback || !isFunctionishExpression(callback)) return;
        if (!callback.async) return;
        const body = callback.body;
        if (!body) return;

        if (
          (methodName === "map" || methodName === "flatMap") &&
          isWrappedInPromiseConcurrency(node)
        ) {
          return;
        }
        if (loopBodyHasOnlySleepLikeAwaits(body)) return;
        if (hasLoopCarriedDependency(body)) return;
        // `body` is either a BlockStatement (block body) or any
        // expression (concise body, e.g. `async x => fetch(x)`); walkAst
        // handles both, so we just walk `body` directly.
        const firstAwait = findFirstAwaitOutsideNestedFunctions(body);
        if (firstAwait) {
          const message =
            methodName === "forEach"
              ? "Async callback in .forEach - return values are dropped, so awaits don't actually wait. Use a `for…of` loop or `await Promise.all(items.map(async (item) => {...}))`"
              : `Async callback in .${methodName} - sequential awaits inside the callback waterfall. Use \`await Promise.all(items.map(async (item) => {...}))\` to run them concurrently`;
          context.report({ node: firstAwait, message });
        }
      },
    };
  },
});
