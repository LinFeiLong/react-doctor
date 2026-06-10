import { defineScanRule } from "../../utils/define-scan-rule.js";
import { isServerRouteSourcePath } from "./utils/is-server-route-source-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

export const tenantStaticProxyRisk = defineScanRule({
  id: "tenant-static-proxy-risk",
  title: "Tenant-controlled static asset proxy",
  severity: "warn",
  recommendation:
    "Bind tenant identity to the trusted host or authenticated org, canonicalize after decoding, reject traversal, and never let one tenant choose another tenant's asset prefix.",
  scan: scanByPattern({
    shouldScan: (file) => isServerRouteSourcePath(file.relativePath),
    pattern:
      /\b(?:tenant|subdomain|org|organization|workspace|hostPattern|params)\b[\s\S]{0,700}\b(?:fetch|S3|s3|cdn|bucket|path\.join|join\(["']\/["']\)|decodeURIComponent)\b/i,
    message:
      "Route code appears to compose tenant or subdomain input into a static/CDN/object-store fetch path.",
  }),
});
