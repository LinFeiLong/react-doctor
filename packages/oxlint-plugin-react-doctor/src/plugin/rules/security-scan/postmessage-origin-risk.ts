import { defineRule } from "../../utils/define-rule.js";
import { isAstNode } from "../../utils/is-ast-node.js";
import type { ScanFinding } from "../../utils/file-scan.js";
import { getCalleeText } from "./utils/get-callee-text.js";
import { getNodeLocation } from "./utils/get-node-location.js";
import { getNodeText } from "./utils/get-node-text.js";
import { getStringLiteralValue } from "./utils/get-string-literal-value.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";
import { parseSourceAst } from "./utils/parse-source-ast.js";
import { walkAst } from "./utils/walk-ast.js";

const POSTMESSAGE_ORIGIN_CHECK_PATTERN =
  /(?:event|e)\.origin|\.origin\s*[!=]==?|origin.*(?:check|valid|allow|trust)|(?:check|valid|allow|trust).*origin/i;

export const postmessageOriginRisk = defineRule({
  id: "postmessage-origin-risk",
  title: "postMessage handler without origin check",
  severity: "warn",
  recommendation:
    "Validate `event.origin` against an exact allowlist before using `event.data`, especially when an iframe or parent window can be attacker-controlled.",
  scan: (file) => {
    if (!isProductionSourcePath(file.relativePath)) return [];
    const ast = parseSourceAst(file);
    if (ast === null) return [];

    const findings: ScanFinding[] = [];
    walkAst(ast, (node) => {
      if (node.type !== "CallExpression" && node.type !== "AssignmentExpression") return;

      const nodeText = getNodeText(file, node);
      let isMessageHandler = false;
      if (node.type === "CallExpression") {
        const calleeText = getCalleeText(file, node);
        const args = Array.isArray(node.arguments) ? node.arguments : [];
        const firstArgument = isAstNode(args[0]) ? args[0] : undefined;
        isMessageHandler =
          calleeText.endsWith("addEventListener") &&
          getStringLiteralValue(firstArgument) === "message";
      } else {
        const left = node.left;
        isMessageHandler = isAstNode(left) && getNodeText(file, left).endsWith(".onmessage");
      }

      if (!isMessageHandler) return;
      const originCheckIndex = nodeText.search(POSTMESSAGE_ORIGIN_CHECK_PATTERN);
      const messageDataIndex = nodeText.search(/\b(?:event|e)\.data\b/);
      if (originCheckIndex >= 0 && (messageDataIndex < 0 || originCheckIndex < messageDataIndex)) {
        return;
      }

      const location = getNodeLocation(file.content, node);
      findings.push({
        message:
          "A message event handler reads cross-window messages without an obvious origin check.",
        line: location.line,
        column: location.column,
      });
    });

    return findings;
  },
});
