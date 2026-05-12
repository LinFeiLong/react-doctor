import { TANSTACK_ROUTE_CREATION_FUNCTIONS, TANSTACK_SERVER_FN_NAMES } from "../constants.js";
import { getCalleeName, isNodeOfType } from "../utils.js";
import type { EsTreeNode } from "../utils.js";

export const SAFE_BUILD_ENV_VARS = new Set(["NODE_ENV", "MODE", "DEV", "PROD"]);

export const SECRET_KEYWORD_PATTERN = /(?:secret|token|api[_]?key|password|private)/i;

// HACK: only flag env vars whose name matches a secret keyword. A loader
// reading process.env.DATABASE_URL or process.env.PORT is fine; what's not
// fine is process.env.STRIPE_SECRET or process.env.NEXT_PUBLIC_API_KEY (the
// latter being a misconfigured public-prefixed key).

export interface ServerFnChainInfo {
  isServerFnChain: boolean;
  specifiedMethod: string | null;
  hasInputValidator: boolean;
}

export const getPropertyKeyName = (property: EsTreeNode): string | null => {
  if (!isNodeOfType(property, "Property") && !isNodeOfType(property, "MethodDefinition"))
    return null;
  if (isNodeOfType(property.key, "Identifier")) return property.key.name;
  if (isNodeOfType(property.key, "Literal")) return String(property.key.value);
  return null;
};

export const getRouteOptionsObject = (node: EsTreeNode): EsTreeNode | null => {
  if (!isNodeOfType(node, "CallExpression")) return null;

  const routeCallee = node.callee;

  if (
    isNodeOfType(routeCallee, "CallExpression") &&
    isNodeOfType(routeCallee.callee, "Identifier")
  ) {
    if (!TANSTACK_ROUTE_CREATION_FUNCTIONS.has(routeCallee.callee.name)) return null;
    const optionsArgument = node.arguments?.[0];
    if (isNodeOfType(optionsArgument, "ObjectExpression")) return optionsArgument;
    return null;
  }

  if (isNodeOfType(routeCallee, "Identifier")) {
    if (!TANSTACK_ROUTE_CREATION_FUNCTIONS.has(routeCallee.name)) return null;
    const optionsArgument = node.arguments?.[0];
    if (isNodeOfType(optionsArgument, "ObjectExpression")) return optionsArgument;
    return null;
  }

  return null;
};

export const hasTopLevelAwait = (statement: EsTreeNode): boolean => {
  if (isNodeOfType(statement, "VariableDeclaration")) {
    return statement.declarations?.some((declarator: EsTreeNode) =>
      isNodeOfType(declarator.init, "AwaitExpression"),
    );
  }
  if (isNodeOfType(statement, "ExpressionStatement")) {
    return (
      isNodeOfType(statement.expression, "AwaitExpression") ||
      (isNodeOfType(statement.expression, "AssignmentExpression") &&
        isNodeOfType(statement.expression.right, "AwaitExpression"))
    );
  }
  if (isNodeOfType(statement, "ReturnStatement")) {
    return isNodeOfType(statement.argument, "AwaitExpression");
  }
  if (isNodeOfType(statement, "ForOfStatement") && statement.await) {
    return true;
  }
  return false;
};

export const isLikelySecret = (envVarName: string): boolean => {
  if (SAFE_BUILD_ENV_VARS.has(envVarName)) return false;
  return SECRET_KEYWORD_PATTERN.test(envVarName);
};

export const walkServerFnChain = (outerNode: EsTreeNode): ServerFnChainInfo => {
  const chainInfo: ServerFnChainInfo = {
    isServerFnChain: false,
    specifiedMethod: null,
    hasInputValidator: false,
  };

  let currentNode: EsTreeNode = outerNode.callee?.object;

  while (isNodeOfType(currentNode, "CallExpression")) {
    const calleeName = getCalleeName(currentNode);

    if (calleeName && TANSTACK_SERVER_FN_NAMES.has(calleeName)) {
      chainInfo.isServerFnChain = true;

      const optionsArgument = currentNode.arguments?.[0];
      if (isNodeOfType(optionsArgument, "ObjectExpression")) {
        for (const property of optionsArgument.properties ?? []) {
          if (
            isNodeOfType(property.key, "Identifier") &&
            property.key.name === "method" &&
            isNodeOfType(property.value, "Literal") &&
            typeof property.value.value === "string"
          ) {
            chainInfo.specifiedMethod = property.value.value;
          }
        }
      }
    }

    if (calleeName === "inputValidator") {
      chainInfo.hasInputValidator = true;
    }

    if (isNodeOfType(currentNode.callee, "MemberExpression")) {
      currentNode = currentNode.callee.object;
    } else {
      break;
    }
  }

  return chainInfo;
};
export {
  EFFECT_HOOK_NAMES,
  MUTATING_HTTP_METHODS,
  SEQUENTIAL_AWAIT_THRESHOLD_FOR_LOADER,
  TANSTACK_MIDDLEWARE_METHOD_ORDER,
  TANSTACK_REDIRECT_FUNCTIONS,
  TANSTACK_ROOT_ROUTE_FILE_PATTERN,
  TANSTACK_ROUTE_FILE_PATTERN,
  TANSTACK_ROUTE_PROPERTY_ORDER,
  TANSTACK_SERVER_FN_FILE_PATTERN,
  TANSTACK_SERVER_FN_NAMES,
  UPPERCASE_PATTERN,
} from "../constants.js";
export { findSideEffect, isHookCall, walkAst, isNodeOfType } from "../utils.js";
export type { EsTreeNode, RuleContext, Rule } from "../utils.js";
