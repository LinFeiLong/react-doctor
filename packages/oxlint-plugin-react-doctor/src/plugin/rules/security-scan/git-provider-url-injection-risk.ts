import { defineRule } from "../../utils/define-rule.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

const GIT_PROVIDER_URL_INJECTION_PATTERN =
  /(?:api\.github\.com|github\.com|gitlab\.com|bitbucket\.org)[^`'"]{0,200}\$\{|`https?:\/\/[^`]{0,80}git[^`]{0,80}\$\{/i;

export const gitProviderUrlInjectionRisk = defineRule({
  id: "git-provider-url-injection-risk",
  title: "Git provider URL built from interpolation",
  severity: "warn",
  recommendation:
    "Validate owner, repo, org, and branch identifiers against strict slugs and build URLs with URL/path encoders instead of raw interpolation.",
  scan: scanByPattern({
    shouldScan: (file) => isProductionSourcePath(file.relativePath),
    pattern: GIT_PROVIDER_URL_INJECTION_PATTERN,
    message:
      "GitHub/GitLab/Bitbucket URL construction interpolates path components that may be attacker-controlled.",
  }),
});
