import { defineRule } from "../../registry.js";
import {
  SEQUENTIAL_AWAIT_THRESHOLD_FOR_LOADER,
  getPropertyKeyName,
  getRouteOptionsObject,
  hasTopLevelAwait,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const tanstackStartLoaderParallelFetch = defineRule<Rule>({
  recommendation: "Start independent loader promises together and await them with Promise.all.",
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
        if (keyName !== "loader") continue;

        const loaderValue = property.value;
        if (
          !loaderValue ||
          (!isNodeOfType(loaderValue, "ArrowFunctionExpression") &&
            !isNodeOfType(loaderValue, "FunctionExpression"))
        )
          continue;

        const functionBody = loaderValue.body;
        if (!functionBody || !isNodeOfType(functionBody, "BlockStatement")) continue;

        let sequentialAwaitCount = 0;
        for (const statement of functionBody.body ?? []) {
          if (hasTopLevelAwait(statement)) {
            sequentialAwaitCount++;
          }

          if (sequentialAwaitCount >= SEQUENTIAL_AWAIT_THRESHOLD_FOR_LOADER) {
            context.report({
              node: property,
              message:
                "Multiple sequential awaits in loader - use Promise.all() to fetch data in parallel and avoid waterfalls",
            });
            break;
          }
        }
      }
    },
  }),
});
