import { defineRule } from "../../registry.js";
import {
  SECRET_FALSE_POSITIVE_SUFFIXES,
  SECRET_MIN_LENGTH_CHARS,
  SECRET_PATTERNS,
  SECRET_VARIABLE_PATTERN,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noSecretsInClientCode = defineRule<Rule>({
  recommendation:
    "Move secrets to server-only environment variables and expose only public, intentionally prefixed client configuration.",
  examples: [
    {
      before: `const apiKey = process.env.SECRET_API_KEY;`,
      after: `const apiKey = process.env.NEXT_PUBLIC_ANALYTICS_KEY;`,
    },
  ],
  create: (context: RuleContext) => ({
    VariableDeclarator(node: EsTreeNode) {
      if (!isNodeOfType(node.id, "Identifier")) return;
      if (!isNodeOfType(node.init, "Literal") || typeof node.init.value !== "string") return;

      const variableName = node.id.name;
      const literalValue = node.init.value;

      const trailingSuffix = variableName.split("_").pop()?.toLowerCase() ?? "";
      const isUiConstant = SECRET_FALSE_POSITIVE_SUFFIXES.has(trailingSuffix);

      if (
        SECRET_VARIABLE_PATTERN.test(variableName) &&
        !isUiConstant &&
        literalValue.length > SECRET_MIN_LENGTH_CHARS
      ) {
        context.report({
          node,
          message: `Possible hardcoded secret in "${variableName}" - use environment variables instead`,
        });
        return;
      }

      if (SECRET_PATTERNS.some((pattern) => pattern.test(literalValue))) {
        context.report({
          node,
          message: "Hardcoded secret detected - use environment variables instead",
        });
      }
    },
  }),
});
