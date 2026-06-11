import { defineRule } from "../../utils/define-rule.js";
import type { EsTreeNode } from "../../utils/es-tree-node.js";
import type { ScanFinding } from "../../utils/file-scan.js";
import { isAstNode } from "../../utils/is-ast-node.js";
import { parseSourceText } from "../../utils/parse-source-file.js";
import { walkAst } from "../../utils/walk-ast.js";
import { getLocationAtIndex } from "./utils/get-location-at-index.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";

const POSTMESSAGE_ORIGIN_CHECK_PATTERN =
  /(?:event|e)\.origin|\.origin\s*[!=]==?|origin.*(?:check|valid|allow|trust)|(?:check|valid|allow|trust).*origin/i;

const MESSAGE_DATA_READ_PATTERN = /\b(?:event|e)\.data\b/;

// oxc's parseSync emits ESTree byte offsets as `start`/`end` (it never
// populates `range`), which TSESTree's types don't declare — so read
// them structurally.
const getNodeStartIndex = (node: EsTreeNode): number =>
  "start" in node && typeof node.start === "number" ? node.start : -1;

const getNodeText = (content: string, node: EsTreeNode): string => {
  const startIndex = getNodeStartIndex(node);
  const endIndex = "end" in node && typeof node.end === "number" ? node.end : -1;
  if (startIndex < 0 || endIndex < 0) return "";
  return content.slice(startIndex, endIndex);
};

// `window.addEventListener("message", …)` or `window.onmessage = …`.
const isMessageEventHandler = (content: string, node: EsTreeNode): boolean => {
  if (node.type === "CallExpression") {
    const calleeText = isAstNode(node.callee) ? getNodeText(content, node.callee) : "";
    if (!calleeText.endsWith("addEventListener")) return false;
    const firstArgument = node.arguments[0];
    return (
      isAstNode(firstArgument) &&
      firstArgument.type === "Literal" &&
      firstArgument.value === "message"
    );
  }
  if (node.type === "AssignmentExpression") {
    return isAstNode(node.left) && getNodeText(content, node.left).endsWith(".onmessage");
  }
  return false;
};

export const postmessageOriginRisk = defineRule({
  id: "postmessage-origin-risk",
  title: "postMessage handler without origin check",
  severity: "warn",
  recommendation:
    "Validate `event.origin` against an exact allowlist before using `event.data`, especially when an iframe or parent window can be attacker-controlled.",
  scan: (file) => {
    if (!isProductionSourcePath(file.relativePath)) return [];
    const ast = parseSourceText(file.absolutePath, file.content);
    if (ast === null) return [];

    const findings: ScanFinding[] = [];
    walkAst(ast, (node) => {
      if (!isMessageEventHandler(file.content, node)) return;

      const nodeText = getNodeText(file.content, node);
      const originCheckIndex = nodeText.search(POSTMESSAGE_ORIGIN_CHECK_PATTERN);
      const messageDataIndex = nodeText.search(MESSAGE_DATA_READ_PATTERN);
      if (originCheckIndex >= 0 && (messageDataIndex < 0 || originCheckIndex < messageDataIndex)) {
        return;
      }

      const location = getLocationAtIndex(file.content, getNodeStartIndex(node));
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
