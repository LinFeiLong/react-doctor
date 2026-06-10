import { defineRule } from "../../utils/define-rule.js";
import type { ScanFinding } from "../../utils/file-scan.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";

const DANGEROUS_HTML_PATTERN = /dangerouslySetInnerHTML|\.innerHTML\s*=/;

const DANGEROUS_HTML_TAINT_PATTERN =
  /searchParams|query|params|request|req\.|response\.|result\.|data\.|await|fetch|props\.|children|content|html|body|text|message/i;

export const dangerousHtmlSink = defineRule({
  id: "dangerous-html-sink",
  title: "HTML injection sink with dynamic content",
  severity: "warn",
  recommendation:
    "Prefer rendering structured React nodes. If HTML is required, sanitize with a well-reviewed sanitizer and keep the trust boundary close to the sink.",
  scan: (file) => {
    if (!isProductionSourcePath(file.relativePath)) return [];
    if (!DANGEROUS_HTML_PATTERN.test(file.content)) return [];

    const findings: ScanFinding[] = [];
    const lines = file.content.split("\n");
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex] ?? "";
      if (!DANGEROUS_HTML_PATTERN.test(line)) continue;

      const htmlWindow = lines.slice(Math.max(0, lineIndex - 3), lineIndex + 5).join("\n");
      if (/__html\s*:\s*["'`]/.test(htmlWindow)) continue;
      if (!DANGEROUS_HTML_TAINT_PATTERN.test(htmlWindow)) continue;

      findings.push({
        message:
          "HTML is injected from a dynamic-looking source, which can become XSS if the value is user-controlled or unsanitized.",
        line: lineIndex + 1,
        column: line.search(/\S/) + 1,
      });
    }
    return findings;
  },
});
