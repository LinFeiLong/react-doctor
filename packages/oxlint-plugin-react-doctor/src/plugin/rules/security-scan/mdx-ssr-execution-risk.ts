import { defineScanRule } from "../../utils/define-scan-rule.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

export const mdxSsrExecutionRisk = defineScanRule({
  id: "mdx-ssr-execution-risk",
  title: "Server-rendered MDX can execute code",
  severity: "warn",
  recommendation:
    "Use a constrained compiler for untrusted content, disable expressions/raw HTML, sandbox renderers, and avoid caching attacker-controlled output across tenants.",
  scan: scanByPattern({
    shouldScan: (file) => isProductionSourcePath(file.relativePath),
    pattern:
      /\b(?:@mdx-js\/mdx|next-mdx-remote|MDXRemote|compileMDX|evaluate|compile)\b[\s\S]{0,700}\b(?:mdx|markdown|content|source|body|repo|customer|tenant|cache|process\.env|rehypeRaw|allowDangerousHtml)\b/i,
    message:
      "MDX/markdown rendering code may evaluate user or repository content during SSR or static generation.",
  }),
});
