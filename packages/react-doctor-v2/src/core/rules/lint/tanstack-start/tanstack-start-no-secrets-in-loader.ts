import { defineRule } from "../../registry.js";
import {
  getPropertyKeyName,
  getRouteOptionsObject,
  isLikelySecret,
  walkAst,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartNoSecretsInLoader = defineRule<Rule>({
  recommendation:
    "Keep secrets in server functions or server-only modules and pass only safe public data through loaders.",
  examples: [
    {
      before: `export const Route = createFileRoute("/items")({ component: Items });`,
      after: `export const Route = createFileRoute("/items")({ loader, head, component: Items });`,
    },
  ],
  create: (context: RuleContext) => ({
    CallExpression(node: EsTreeNode) {
      const optionsObject = getRouteOptionsObject(node);
      if (!optionsObject) return;

      const properties = optionsObject.properties ?? [];
      for (const property of properties) {
        const keyName = getPropertyKeyName(property);
        if (keyName !== "loader" && keyName !== "beforeLoad") continue;

        const loaderValue = property.value ?? property;
        walkAst(loaderValue, (child: EsTreeNode) => {
          if (!isNodeOfType(child, "MemberExpression")) return;
          const isProcessEnvAccess =
            isNodeOfType(child.object, "MemberExpression") &&
            isNodeOfType(child.object.object, "Identifier") &&
            child.object.object.name === "process" &&
            isNodeOfType(child.object.property, "Identifier") &&
            child.object.property.name === "env";
          const isImportMetaEnvAccess =
            isNodeOfType(child.object, "MemberExpression") &&
            isNodeOfType(child.object.object, "MetaProperty") &&
            isNodeOfType(child.object.property, "Identifier") &&
            child.object.property.name === "env";

          if (!isProcessEnvAccess && !isImportMetaEnvAccess) return;

          const envVarName = isNodeOfType(child.property, "Identifier")
            ? child.property.name
            : null;
          if (envVarName && isLikelySecret(envVarName)) {
            const envSource = isImportMetaEnvAccess ? "import.meta.env" : "process.env";
            context.report({
              node: child,
              message: `${envSource}.${envVarName} in ${keyName} - loaders are isomorphic and may leak secrets to the client. Move to a createServerFn()`,
            });
          }
        });
      }
    },
  }),
});
