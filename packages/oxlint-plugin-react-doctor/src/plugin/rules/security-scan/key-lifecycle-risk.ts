import { TEST_CONTEXT_PATTERN } from "../../constants/security-scan.js";
import { defineRule } from "../../utils/define-rule.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

export const keyLifecycleRisk = defineRule({
  id: "key-lifecycle-risk",
  title: "Long-lived key material in repository",
  severity: "error",
  recommendation:
    "Remove private keys from source, rotate exposed credentials, prefer short-lived deploy credentials, and document revocation/expiry for release keys.",
  // A key-shaped env NAME is how CI correctly references a secret store —
  // only flag actual PEM material or a name assigned an inline literal value.
  // A `...` ellipsis early in the PEM body marks a truncated docs/config
  // placeholder (`MIIEvgIBADAN...`), not real key material.
  scan: scanByPattern({
    shouldScan: (file) => !TEST_CONTEXT_PATTERN.test(file.relativePath),
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----(?![^-]{0,160}\.\.\.)|\b(?:SSH_PRIVATE_KEY|GPG_PRIVATE_KEY|DEPLOY_KEY|SIGNING_KEY)\b\s*[:=]\s*["'][^"'\n]{16,}["']/i,
    message: "Private or long-lived release key material appears in the repository.",
  }),
});
