import { defineRule } from "../../registry.js";
import {
  PAGES_ROUTER_API_PATH_PATTERN,
  ROUTE_HANDLER_HTTP_METHODS,
  collectIdentifierParams,
  inspectHandlerBody,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const serverHoistStaticIo = defineRule<Rule>({
  recommendation:
    "Hoist static file and asset reads to module scope so route handlers do not repeat the same I/O on every request.",
  examples: [
    {
      before: `export async function GET() { return readFileSync("logo.svg"); }`,
      after: `const logo = readFileSync("logo.svg");
export async function GET() { return logo; }`,
    },
  ],
  create: (context: RuleContext) => ({
    ExportNamedDeclaration(node: EsTreeNode) {
      const declaration = node.declaration;
      if (!isNodeOfType(declaration, "FunctionDeclaration")) return;
      const handlerName = declaration.id?.name;
      if (!handlerName || !ROUTE_HANDLER_HTTP_METHODS.has(handlerName)) return;
      if (!isNodeOfType(declaration.body, "BlockStatement")) return;
      inspectHandlerBody(
        context,
        declaration.body,
        `${handlerName} route handler`,
        collectIdentifierParams(declaration.params ?? []),
      );
    },
    ExportDefaultDeclaration(node: EsTreeNode) {
      const filename = context.getFilename?.() ?? "";
      if (!PAGES_ROUTER_API_PATH_PATTERN.test(filename)) return;
      const declaration = node.declaration;
      if (
        !isNodeOfType(declaration, "FunctionDeclaration") &&
        !isNodeOfType(declaration, "FunctionExpression") &&
        !isNodeOfType(declaration, "ArrowFunctionExpression")
      ) {
        return;
      }
      if (!declaration.async) return;
      const body = declaration.body;
      if (!isNodeOfType(body, "BlockStatement")) return;
      inspectHandlerBody(
        context,
        body,
        "pages/api handler",
        collectIdentifierParams(declaration.params ?? []),
      );
    },
  }),
});
