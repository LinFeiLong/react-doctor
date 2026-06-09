import { SECRET_VALUE_PATTERNS } from "../../constants/security.js";
import { definePostureRule } from "../../utils/define-posture-rule.js";
import { scanArtifactLeak } from "./utils/scan-artifact-leak.js";

export const artifactSecretLeak = definePostureRule({
  id: "artifact-secret-leak",
  title: "Secret shipped in browser artifact",
  severity: "error",
  recommendation:
    "Remove the secret from client bundles/static assets, rotate it, and route privileged service calls through server-only code.",
  scan: (file) =>
    scanArtifactLeak(
      file,
      (content) => SECRET_VALUE_PATTERNS.find((pattern) => pattern.test(content)),
      "A browser-delivered artifact contains a secret-looking credential value.",
    ),
});
