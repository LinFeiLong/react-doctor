import { defineRule } from "../../utils/define-rule.js";
import { EFFECT_HOOK_NAMES } from "../../constants/react.js";
import { findProgramRoot } from "../../utils/find-program-root.js";
import { getImportedName } from "../../utils/get-imported-name.js";
import { isHookCall } from "../../utils/is-hook-call.js";
import { walkAst } from "../../utils/walk-ast.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNode } from "../../utils/es-tree-node.js";
import { isNodeOfType } from "../../utils/is-node-of-type.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";

// HACK: React 19.2's `<Activity mode="hidden">` preserves state for a
// subtree but cleans up its Effects. When the boundary becomes visible
// again, React recreates every Effect — subscriptions, observers,
// effect-driven setState chains. On dense screens (settings, profile
// editor, checkout) the visible cost is a "remount storm" on what
// looks like a free state-preservation primitive. This rule is the
// narrow v1: report an `<Activity>` with a TOGGLEABLE `mode` wrapping
// any same-file component that itself uses `useEffect` /
// `useLayoutEffect`. The user can then audit whether the inner
// effects belong outside the Activity boundary.

const ACTIVITY_IMPORTED_NAMES = new Set(["Activity", "unstable_Activity"]);

const isStaticVisibleMode = (modeAttribute: EsTreeNodeOfType<"JSXAttribute">): boolean => {
  const value = modeAttribute.value;
  if (!value) return false;
  if (isNodeOfType(value, "Literal")) return value.value === "visible";
  if (isNodeOfType(value, "JSXExpressionContainer")) {
    const expression = value.expression;
    if (isNodeOfType(expression, "Literal")) return expression.value === "visible";
  }
  return false;
};

const getJsxElementName = (node: EsTreeNode): string | null => {
  if (isNodeOfType(node, "JSXIdentifier")) return node.name;
  if (isNodeOfType(node, "JSXMemberExpression")) {
    if (isNodeOfType(node.property, "JSXIdentifier")) return node.property.name;
  }
  return null;
};

const COMPONENT_NAME_PATTERN = /^[A-Z]/;

const collectChildComponentNames = (
  element: EsTreeNodeOfType<"JSXElement">,
  into: Set<string>,
): void => {
  walkAst(element, (child: EsTreeNode) => {
    if (!isNodeOfType(child, "JSXOpeningElement")) return;
    const name = getJsxElementName(child.name);
    if (!name) return;
    if (!COMPONENT_NAME_PATTERN.test(name)) return;
    into.add(name);
  });
};

const findSameFileComponentBody = (
  programRoot: EsTreeNode,
  componentName: string,
): EsTreeNode | null => {
  let foundBody: EsTreeNode | null = null;
  walkAst(programRoot, (node: EsTreeNode) => {
    if (foundBody) return false;
    if (isNodeOfType(node, "FunctionDeclaration") && node.id && node.id.name === componentName) {
      foundBody = node.body;
      return false;
    }
    if (
      isNodeOfType(node, "VariableDeclarator") &&
      isNodeOfType(node.id, "Identifier") &&
      node.id.name === componentName
    ) {
      const initializer = node.init;
      if (
        isNodeOfType(initializer, "ArrowFunctionExpression") ||
        isNodeOfType(initializer, "FunctionExpression")
      ) {
        foundBody = initializer.body;
        return false;
      }
    }
  });
  return foundBody;
};

const countEffectHookCalls = (body: EsTreeNode | null): number => {
  if (!body) return 0;
  let count = 0;
  walkAst(body, (child: EsTreeNode) => {
    if (!isNodeOfType(child, "CallExpression")) return;
    if (isHookCall(child, EFFECT_HOOK_NAMES)) count++;
  });
  return count;
};

export const activityWrapsEffectHeavySubtree = defineRule<Rule>({
  id: "activity-wraps-effect-heavy-subtree",
  severity: "warn",
  requires: ["react:19"],
  recommendation:
    "Audit the subtree under `<Activity>` — every hide / show cycle tears down and recreates every Effect inside. Move subscriptions and effect-driven setState chains outside the Activity boundary, or pre-resolve the data above it",
  create: (context: RuleContext) => {
    const localActivityNames = new Set<string>();

    const reactNamespaceLocalNames = new Set<string>();

    return {
      ImportDeclaration(node: EsTreeNodeOfType<"ImportDeclaration">) {
        if (node.source?.value !== "react") return;
        for (const specifier of node.specifiers ?? []) {
          if (isNodeOfType(specifier, "ImportNamespaceSpecifier")) {
            // `import * as React from "react"` — bind the local name so
            // `<X.Activity>` can be verified against it.
            if (isNodeOfType(specifier.local, "Identifier")) {
              reactNamespaceLocalNames.add(specifier.local.name);
            }
            continue;
          }
          if (isNodeOfType(specifier, "ImportDefaultSpecifier")) {
            // `import React from "react"` — same shape, same handling.
            if (isNodeOfType(specifier.local, "Identifier")) {
              reactNamespaceLocalNames.add(specifier.local.name);
            }
            continue;
          }
          if (!isNodeOfType(specifier, "ImportSpecifier")) continue;
          const importedName = getImportedName(specifier);
          if (!importedName || !ACTIVITY_IMPORTED_NAMES.has(importedName)) continue;
          if (isNodeOfType(specifier.local, "Identifier")) {
            localActivityNames.add(specifier.local.name);
          }
        }
      },
      JSXElement(node: EsTreeNodeOfType<"JSXElement">) {
        const openingElement = node.openingElement;
        if (!openingElement) return;
        const elementName = openingElement.name;
        let isActivity = false;
        if (isNodeOfType(elementName, "JSXIdentifier")) {
          isActivity = localActivityNames.has(elementName.name);
        } else if (isNodeOfType(elementName, "JSXMemberExpression")) {
          // `<React.Activity>` namespace form — verify the namespace
          // resolves to the React default / namespace import (not a
          // local `<Calendar.Activity>` user component).
          if (
            isNodeOfType(elementName.object, "JSXIdentifier") &&
            reactNamespaceLocalNames.has(elementName.object.name) &&
            isNodeOfType(elementName.property, "JSXIdentifier")
          ) {
            isActivity = ACTIVITY_IMPORTED_NAMES.has(elementName.property.name);
          }
        }
        if (!isActivity) return;

        let modeAttribute: EsTreeNodeOfType<"JSXAttribute"> | null = null;
        for (const attribute of openingElement.attributes ?? []) {
          if (!isNodeOfType(attribute, "JSXAttribute")) continue;
          if (!isNodeOfType(attribute.name, "JSXIdentifier")) continue;
          if (attribute.name.name !== "mode") continue;
          modeAttribute = attribute;
          break;
        }
        // No `mode` prop = default visible = always visible = no
        // hide/show cycle. Skip.
        if (!modeAttribute) return;
        // Statically `mode="visible"` = pinned visible = no cycle.
        if (isStaticVisibleMode(modeAttribute)) return;

        const childComponentNames = new Set<string>();
        collectChildComponentNames(node, childComponentNames);
        // Drop the Activity name itself if a child happens to be a
        // nested <Activity /> — that's a different rule's concern.
        for (const activityName of localActivityNames) childComponentNames.delete(activityName);
        if (childComponentNames.size === 0) return;

        const programRoot = findProgramRoot(node);
        if (!programRoot) return;

        let totalEffects = 0;
        const effectfulChildren: string[] = [];
        for (const componentName of childComponentNames) {
          const body = findSameFileComponentBody(programRoot, componentName);
          if (!body) continue;
          const effectCount = countEffectHookCalls(body);
          if (effectCount === 0) continue;
          totalEffects += effectCount;
          effectfulChildren.push(`<${componentName}>`);
        }
        if (totalEffects === 0) return;

        context.report({
          node: openingElement,
          message: `<Activity> wraps ${effectfulChildren.join(", ")} which use ${totalEffects} effect hook${totalEffects === 1 ? "" : "s"} — every hide/show cycle recreates them all. Audit the subtree or move subscriptions outside the boundary`,
        });
      },
    };
  },
});
