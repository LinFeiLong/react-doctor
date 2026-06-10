import { TEST_CONTEXT_PATTERN } from "../../constants/security-scan.js";
import { defineScanRule } from "../../utils/define-scan-rule.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

export const keyLifecycleRisk = defineScanRule({
  id: "key-lifecycle-risk",
  title: "Long-lived key material in repository",
  severity: "error",
  recommendation:
    "Remove private keys from source, rotate exposed credentials, prefer short-lived deploy credentials, and document revocation/expiry for release keys.",
  scan: scanByPattern({
    shouldScan: (file) => !TEST_CONTEXT_PATTERN.test(file.relativePath),
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----|\b(?:SSH_PRIVATE_KEY|GPG_PRIVATE_KEY|DEPLOY_KEY|SIGNING_KEY)\b/i,
    message: "Private or long-lived release key material appears in the repository.",
  }),
});
