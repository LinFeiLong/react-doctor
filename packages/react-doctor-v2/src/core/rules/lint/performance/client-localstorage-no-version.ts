import { defineRule } from "../../registry.js";
import {
  STORAGE_OBJECTS,
  VERSIONED_KEY_PATTERN,
  isJsonStringifyCall,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const clientLocalstorageNoVersion = defineRule<Rule>({
  recommendation:
    "Version localStorage keys or stored schemas and keep payloads minimal so future releases can migrate safely.",
  examples: [
    {
      before: `localStorage.setItem("settings", JSON.stringify(settings));`,
      after: `localStorage.setItem("settings:v2", JSON.stringify({ version: 2, settings }));`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      if (!isNodeOfType(node.callee, "MemberExpression")) return;
      if (!isNodeOfType(node.callee.object, "Identifier")) return;
      if (!STORAGE_OBJECTS.has(node.callee.object.name)) return;
      if (!isNodeOfType(node.callee.property, "Identifier")) return;
      if (node.callee.property.name !== "setItem") return;

      const keyArg = node.arguments?.[0];
      if (!keyArg) return;
      if (!isNodeOfType(keyArg, "Literal")) return;
      if (typeof keyArg.value !== "string") return;
      if (VERSIONED_KEY_PATTERN.test(keyArg.value)) return;

      const valueArg = node.arguments?.[1];
      if (!valueArg) return;
      if (!isJsonStringifyCall(valueArg)) return;

      context.report({
        node: keyArg,
        message: `${node.callee.object.name}.setItem("${keyArg.value}", JSON.stringify(...)) - bake a version into the key (e.g. "${keyArg.value}:v1") so a future schema change can ignore old data instead of crashing on it`,
      });
    },
  }),
});
