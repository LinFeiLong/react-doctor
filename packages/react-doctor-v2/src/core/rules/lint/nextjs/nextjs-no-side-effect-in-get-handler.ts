import { defineRule } from "../../registry.js";
import {
  ROUTE_HANDLER_FILE_PATTERN,
  extractMutatingRouteSegment,
  findSideEffect,
  getExportedGetHandlerBody,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const nextjsNoSideEffectInGetHandler = defineRule<Rule>({
  recommendation:
    "Keep GET route handlers idempotent and move mutations, logging with side effects, and writes to POST or server actions.",
  examples: [
    {
      before: `export async function GET() { await db.user.create({ data }); }`,
      after: `export async function POST() { await db.user.create({ data }); }`,
    },
  ],
  create: (context: RuleContext) => ({
    ExportNamedDeclaration(node: EsTreeNode) {
      const filename = context.getFilename?.() ?? "";
      if (!ROUTE_HANDLER_FILE_PATTERN.test(filename)) return;

      const handlerBody = getExportedGetHandlerBody(node);
      if (!handlerBody) return;

      const mutatingSegment = extractMutatingRouteSegment(filename);
      if (mutatingSegment) {
        context.report({
          node,
          message: `GET handler on "/${mutatingSegment}" route - use POST to prevent CSRF and unintended prefetch triggers`,
        });
        return;
      }

      const sideEffect = findSideEffect(handlerBody);
      if (sideEffect) {
        context.report({
          node,
          message: `GET handler has side effects (${sideEffect}) - use POST to prevent CSRF and unintended prefetch triggers`,
        });
      }
    },
  }),
});
