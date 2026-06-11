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

// Any reference to an origin counts as a check: validation frequently lives
// in a called helper (`isTrustedOrigin(event)`) or a destructured binding.
// Substring match (not \b) so camelCase helper names count; `(?!al)` keeps
// `original` from counting. `event.source ===` comparisons against a known
// window are an equivalent sender check.
const POSTMESSAGE_ORIGIN_CHECK_PATTERN = /origin(?!al)|\.source\s*[!=]==?/i;

const MESSAGE_DATA_READ_PATTERN = /\b(?:event|e|evt|msg|message)\.data\b/;

// MessagePort/Worker/BroadcastChannel/EventSource/WebSocket message events
// are same-application or server-stream channels; window-origin checks
// neither exist nor apply there. `self.onmessage` is the worker-global
// handler idiom.
const SAME_APPLICATION_CHANNEL_TARGET_PATTERN =
  /\b(?:port\d?|worker|channel|broadcast|socket|ws|sse)|eventsource|^self\./i;

const WORKER_FILE_PATH_PATTERN = /worker/i;

export const postmessageOriginRisk = defineRule({
  id: "postmessage-origin-risk",
  title: "postMessage handler without origin check",
  severity: "warn",
  recommendation:
    "Validate `event.origin` against an exact allowlist before using `event.data`, especially when an iframe or parent window can be attacker-controlled.",
  scan: (file) => {
    if (!isProductionSourcePath(file.relativePath)) return [];
    if (WORKER_FILE_PATH_PATTERN.test(file.relativePath)) return [];
    const ast = parseSourceAst(file);
    if (ast === null) return [];

    const findings: ScanFinding[] = [];
    walkAst(ast, (node) => {
      if (node.type !== "CallExpression" && node.type !== "AssignmentExpression") return;

      const nodeText = getNodeText(file, node);
      let isMessageHandler = false;
      let targetText = "";
      if (node.type === "CallExpression") {
        const calleeText = getCalleeText(file, node);
        const args = Array.isArray(node.arguments) ? node.arguments : [];
        const firstArgument = isAstNode(args[0]) ? args[0] : undefined;
        isMessageHandler =
          calleeText.endsWith("addEventListener") &&
          getStringLiteralValue(firstArgument) === "message";
        targetText = calleeText;
      } else {
        const left = node.left;
        isMessageHandler = isAstNode(left) && getNodeText(file, left).endsWith(".onmessage");
        if (isAstNode(left)) targetText = getNodeText(file, left);
      }

      if (!isMessageHandler) return;
      if (SAME_APPLICATION_CHANNEL_TARGET_PATTERN.test(targetText)) return;
      const messageDataIndex = nodeText.search(MESSAGE_DATA_READ_PATTERN);
      if (messageDataIndex < 0) return;
      const originCheckIndex = nodeText.search(POSTMESSAGE_ORIGIN_CHECK_PATTERN);
      if (originCheckIndex >= 0 && originCheckIndex < messageDataIndex) return;

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
