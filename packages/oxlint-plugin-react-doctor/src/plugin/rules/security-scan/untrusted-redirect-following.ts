import { SERVER_CONTEXT_PATTERN } from "../../constants/security-scan.js";
import { defineRule } from "../../utils/define-rule.js";
import type { ScanFinding } from "../../utils/file-scan.js";
import { isServerRouteSourcePath } from "./utils/is-server-route-source-path.js";

const OUTBOUND_FETCH_CALL_PATTERN =
  /\b(?:fetch|axios\.\s*(?:get|post|put|delete|head)|got|got\.\s*(?:get|post))\s*\(\s*([^,)]+)/;

const CALLER_STYLE_URL_NAME_PATTERN =
  /\b(?:url|targetUrl|callbackUrl|redirectUrl|webhookUrl|companyUrl|websiteUrl|domainUrl|imageUrl|fetchUrl|next|return_to|returnTo|destination|location)\b/i;

const SAFE_REDIRECT_MODE_PATTERN = /\bredirect\s*:\s*["'](?:manual|error)["']/;

export const untrustedRedirectFollowing = defineRule({
  id: "untrusted-redirect-following",
  title: "Server fetch follows redirects for caller-shaped URL",
  severity: "warn",
  recommendation:
    'Use `redirect: "manual"` or equivalent and re-validate every redirect target before following it to avoid SSRF redirect bypasses.',
  scan: (file) => {
    if (
      !isServerRouteSourcePath(file.relativePath) &&
      !SERVER_CONTEXT_PATTERN.test(file.relativePath)
    ) {
      return [];
    }
    if (!OUTBOUND_FETCH_CALL_PATTERN.test(file.content)) return [];

    const findings: ScanFinding[] = [];
    const lines = file.content.split("\n");
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex] ?? "";
      const fetchMatch = line.match(OUTBOUND_FETCH_CALL_PATTERN);
      if (!fetchMatch || !CALLER_STYLE_URL_NAME_PATTERN.test(fetchMatch[1] ?? "")) continue;

      const fetchWindow = lines.slice(lineIndex, lineIndex + 5).join("\n");
      if (SAFE_REDIRECT_MODE_PATTERN.test(fetchWindow)) continue;

      findings.push({
        message:
          "Server-side fetch code appears to follow redirects for a URL shaped like caller-controlled input.",
        line: lineIndex + 1,
        column: line.search(/\S/) + 1,
      });
    }
    return findings;
  },
});
