import { MUTATING_ROUTE_SEGMENTS } from "../constants.js";
import { walkAst, isNodeOfType } from "../utils.js";
import type { EsTreeNode } from "../utils.js";

export const describeClientSideNavigation = (
  node: EsTreeNode,
  isPagesRouterFile: boolean,
): string | null => {
  const redirectGuidance = isPagesRouterFile
    ? "handle navigation in an event handler, getServerSideProps redirect, or middleware"
    : "use redirect() from next/navigation or handle navigation in an event handler";

  if (isNodeOfType(node, "CallExpression") && isNodeOfType(node.callee, "MemberExpression")) {
    const objectName = isNodeOfType(node.callee.object, "Identifier")
      ? node.callee.object.name
      : null;
    const methodName = isNodeOfType(node.callee.property, "Identifier")
      ? node.callee.property.name
      : null;
    if (objectName === "router" && (methodName === "push" || methodName === "replace")) {
      return `router.${methodName}() in useEffect - ${redirectGuidance}`;
    }
  }

  if (isNodeOfType(node, "AssignmentExpression") && isNodeOfType(node.left, "MemberExpression")) {
    const objectName = isNodeOfType(node.left.object, "Identifier") ? node.left.object.name : null;
    const propertyName = isNodeOfType(node.left.property, "Identifier")
      ? node.left.property.name
      : null;
    if (objectName === "window" && propertyName === "location") {
      return `window.location assignment in useEffect - ${redirectGuidance}`;
    }
    if (objectName === "location" && propertyName === "href") {
      return `location.href assignment in useEffect - ${redirectGuidance}`;
    }
  }

  return null;
};

export const extractMutatingRouteSegment = (filename: string): string | null => {
  const segments = filename.split("/");
  for (const segment of segments) {
    const cleaned = segment.replace(/^\[.*\]$/, "");
    if (MUTATING_ROUTE_SEGMENTS.has(cleaned)) return cleaned;
  }
  return null;
};

export const fileMentionsSuspense = (programNode: EsTreeNode): boolean => {
  let didSee = false;
  walkAst(programNode, (child: EsTreeNode) => {
    if (didSee) return false;
    if (
      isNodeOfType(child, "JSXOpeningElement") &&
      isNodeOfType(child.name, "JSXIdentifier") &&
      child.name.name === "Suspense"
    ) {
      didSee = true;
      return false;
    }
    if (isNodeOfType(child, "ImportDeclaration") && child.source?.value === "react") {
      const importsSuspense = (child.specifiers ?? []).some(
        (specifier: EsTreeNode) =>
          isNodeOfType(specifier, "ImportSpecifier") && specifier.imported?.name === "Suspense",
      );
      if (importsSuspense) {
        didSee = true;
        return false;
      }
    }
  });
  return didSee;
};

export const getExportedGetHandlerBody = (node: EsTreeNode): EsTreeNode | null => {
  if (!isNodeOfType(node, "ExportNamedDeclaration")) return null;
  const declaration = node.declaration;
  if (!declaration) return null;

  if (isNodeOfType(declaration, "FunctionDeclaration") && declaration.id?.name === "GET") {
    return declaration.body;
  }

  if (isNodeOfType(declaration, "VariableDeclaration")) {
    for (const declarator of declaration.declarations ?? []) {
      if (
        isNodeOfType(declarator.id, "Identifier") &&
        declarator.id.name === "GET" &&
        declarator.init &&
        (isNodeOfType(declarator.init, "ArrowFunctionExpression") ||
          isNodeOfType(declarator.init, "FunctionExpression"))
      ) {
        return declarator.init.body;
      }
    }
  }

  return null;
};
export {
  APP_DIRECTORY_PATTERN,
  EFFECT_HOOK_NAMES,
  EXECUTABLE_SCRIPT_TYPES,
  GOOGLE_FONTS_PATTERN,
  INTERNAL_PAGE_PATH_PATTERN,
  NEXTJS_NAVIGATION_FUNCTIONS,
  OG_ROUTE_PATTERN,
  PAGE_FILE_PATTERN,
  PAGE_OR_LAYOUT_FILE_PATTERN,
  PAGES_DIRECTORY_PATTERN,
  POLYFILL_SCRIPT_PATTERN,
  ROUTE_HANDLER_FILE_PATTERN,
} from "../constants.js";
export {
  containsFetchCall,
  findJsxAttribute,
  findSideEffect,
  getEffectCallback,
  hasDirective,
  hasJsxAttribute,
  isComponentAssignment,
  isHookCall,
  isUppercaseName,
  walkAst,
  isNodeOfType,
} from "../utils.js";
export type { EsTreeNode, RuleContext, Rule } from "../utils.js";
