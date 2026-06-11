import { defineRule } from "../../utils/define-rule.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

const WEBHOOK_HANDLER_PATTERN =
  /(?:^|\/)[^/]*webhook[^/]*\/|(?:^|\/)[^/]*webhook[^/]*\.[cm]?[jt]s$|\bwebhook\b/i;

const WEBHOOK_ENTRYPOINT_PATTERN =
  /\b(?:export\s+(?:async\s+)?function\s+POST|export\s+const\s+(?:POST|handler|webhook)|webhookHandler|webhookRoute)\b/i;

const WEBHOOK_SIGNATURE_VERIFICATION_PATTERN =
  /verifySignature|verify.*signature|constructEvent|createHmac|timingSafeEqual|svix|webhookSecret|stripe\.webhooks/i;

export const webhookSignatureRisk = defineRule({
  id: "webhook-signature-risk",
  title: "Webhook handler lacks signature verification",
  severity: "warn",
  recommendation:
    "Verify provider signatures before parsing or acting on webhook bodies. Use provider SDK helpers or HMAC verification with timing-safe comparison.",
  scan: scanByPattern({
    shouldScan: (file) =>
      isProductionSourcePath(file.relativePath) &&
      (WEBHOOK_HANDLER_PATTERN.test(file.relativePath) ||
        WEBHOOK_HANDLER_PATTERN.test(file.content)),
    pattern: WEBHOOK_ENTRYPOINT_PATTERN,
    suppressWhen: WEBHOOK_SIGNATURE_VERIFICATION_PATTERN,
    message: "Webhook handler code does not show an obvious signature verification step.",
  }),
});
