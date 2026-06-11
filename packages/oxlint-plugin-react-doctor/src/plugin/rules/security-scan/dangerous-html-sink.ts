import { defineRule } from "../../utils/define-rule.js";
import type { ScanFinding } from "../../utils/file-scan.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";

const DANGEROUS_HTML_PATTERN = /dangerouslySetInnerHTML|\.innerHTML\s*[+]?=(?!=)/;

const HTML_VALUE_START_PATTERN = /(?:__html\s*:|\.innerHTML\s*[+]?=(?!=))\s*([\s\S]*)/;

const HTML_TAINT_PATTERN =
  /searchParams|query|params|request|req\.|response\.|result\.|data\.|await|fetch|props\.|children|content|html|body|text|message/i;

const STRING_LITERAL_VALUE_PATTERN = /^(?:["'][^"']*["']|`[^`$]*`)\s*(?:[;,})\n]|$)/;

const MODULE_CONSTANT_VALUE_PATTERN = /^[A-Z][A-Z0-9_]*\s*(?:[;,})\n]|$)/;

// `node.innerHTML = element.outerHTML` serializes a live DOM node back into
// HTML — the value never left the DOM, so it is not an injection boundary.
const DOM_SERIALIZATION_VALUE_PATTERN = /^[\w$.]+\.outerHTML\s*(?:[;,})\n]|$)/;

// `(?<!un)safe` catches sanitized-by-convention names (markdownToSafeHTML,
// descriptionAsSafeHtml) without matching `unsafeHtml`.
const SANITIZER_PATTERN =
  /\b(?:DOMPurify|sanitize\w*|purify|escape[A-Z]\w*|insane|xss)\b|(?<!un)safe/i;

// Values interpolating only deploy-time config (analytics snippets built
// from NEXT_PUBLIC_* ids) are developer-controlled, not user input.
const ENV_CONFIG_VALUE_PATTERN = /process\.env/;

const I18N_VALUE_PATTERN = /\b(?:t|i18n|translate|formatMessage|intl)\s*[.(]/;

// Output of escaping serializers (hast `toHtml`, KaTeX, Shiki, React's
// renderToStaticMarkup) is markup the library generated, not user HTML.
const ESCAPING_SERIALIZER_CALL_PATTERN =
  /^(?:[\w$.]+\.)?(?:toHtml|renderToString|renderToStaticMarkup|codeToHtml|codeToHast)\s*\(/;

const ESCAPING_SERIALIZER_LIBRARY_PATTERN =
  /\bkatex\b|\bshiki\b|codeToHtml\s*\(|renderToStaticMarkup\s*\(|\bhast-util-to-html\b/i;

const BARE_IDENTIFIER_VALUE_PATTERN = /^[\w$]+\s*(?:[;,})\n]|$)/;

// `<style dangerouslySetInnerHTML={{ __html: ... }}>` injects CSS text, not
// executable markup — the critical-CSS idiom, and at worst CSS injection.
const STYLE_TAG_BEFORE_SINK_PATTERN = /<style\b[^<>]*$/;

const STYLE_TAG_LOOKBEHIND_LINES = 5;

const VALUE_LOOKAHEAD_LINES = 4;
const VALUE_EXPRESSION_MAX_CHARS = 300;

// Inline theme-init <script> templates routinely span dozens of lines.
const STATIC_TEMPLATE_LOOKAHEAD_LINES = 60;
const STATIC_TEMPLATE_MAX_CHARS = 5000;

// A backtick template with no `${` anywhere in its body is a static string
// even when it is too long for STRING_LITERAL_VALUE_PATTERN's window
// (inline theme-init <script> snippets routinely run hundreds of chars).
const isStaticTemplateValue = (valueTail: string): boolean => {
  if (!valueTail.startsWith("`")) return false;
  const closingBacktickIndex = valueTail.indexOf("`", 1);
  if (closingBacktickIndex < 0 || closingBacktickIndex > STATIC_TEMPLATE_MAX_CHARS) return false;
  return !valueTail.slice(1, closingBacktickIndex).includes("${");
};

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

      // Judge only the value expression handed to the sink — judging the
      // surrounding window flags any component that mentions text/content/data.
      const sinkWindow = lines.slice(lineIndex, lineIndex + 1 + VALUE_LOOKAHEAD_LINES).join("\n");
      const valueMatch = HTML_VALUE_START_PATTERN.exec(sinkWindow);
      if (valueMatch === null) continue;
      const fullValueTail = (valueMatch[1] ?? "").trimStart();
      const valueTail = fullValueTail.slice(0, VALUE_EXPRESSION_MAX_CHARS);
      // Stop at the statement/prop boundary so code after the sink is not judged.
      const terminatorIndex = valueTail.search(/[;}]/);
      const valueExpression =
        terminatorIndex >= 0 ? valueTail.slice(0, terminatorIndex + 1) : valueTail;

      if (STRING_LITERAL_VALUE_PATTERN.test(valueExpression)) continue;
      if (MODULE_CONSTANT_VALUE_PATTERN.test(valueExpression)) continue;
      if (DOM_SERIALIZATION_VALUE_PATTERN.test(valueExpression)) continue;
      if (SANITIZER_PATTERN.test(valueExpression)) continue;
      if (ENV_CONFIG_VALUE_PATTERN.test(valueExpression)) continue;
      if (I18N_VALUE_PATTERN.test(valueExpression)) continue;
      if (!HTML_TAINT_PATTERN.test(valueExpression)) continue;
      if (ESCAPING_SERIALIZER_CALL_PATTERN.test(valueExpression)) continue;
      if (
        BARE_IDENTIFIER_VALUE_PATTERN.test(valueExpression) &&
        ESCAPING_SERIALIZER_LIBRARY_PATTERN.test(file.content)
      ) {
        continue;
      }
      const longValueTail = HTML_VALUE_START_PATTERN.exec(
        lines.slice(lineIndex, lineIndex + 1 + STATIC_TEMPLATE_LOOKAHEAD_LINES).join("\n"),
      )?.[1]?.trimStart();
      if (isStaticTemplateValue(longValueTail ?? fullValueTail)) continue;
      const textBeforeSink = lines
        .slice(Math.max(0, lineIndex - STYLE_TAG_LOOKBEHIND_LINES), lineIndex + 1)
        .join("\n")
        .slice(0, -line.length + line.search(DANGEROUS_HTML_PATTERN));
      if (STYLE_TAG_BEFORE_SINK_PATTERN.test(textBeforeSink)) continue;

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
