import { defineScanRule } from "../../utils/define-scan-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";

const GIT_PROVIDER_URL_INJECTION_PATTERN =
  /(?:api\.github\.com|github\.com|gitlab\.com|bitbucket\.org)[^`'"]{0,200}\$\{|`https?:\/\/[^`]{0,80}git[^`]{0,80}\$\{/i;

export const gitProviderUrlInjectionRisk = defineScanRule({
  id: "git-provider-url-injection-risk",
  title: "Git provider URL built from interpolation",
  severity: "warn",
  recommendation:
    "Validate owner, repo, org, and branch identifiers against strict slugs and build URLs with URL/path encoders instead of raw interpolation.",
  scan: (file) => {
    if (!isProductionSourcePath(file.relativePath)) return [];
    if (!GIT_PROVIDER_URL_INJECTION_PATTERN.test(file.content)) return [];

    const location = getMatchLocation(file.content, GIT_PROVIDER_URL_INJECTION_PATTERN);
    return [
      {
        message:
          "GitHub/GitLab/Bitbucket URL construction interpolates path components that may be attacker-controlled.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
