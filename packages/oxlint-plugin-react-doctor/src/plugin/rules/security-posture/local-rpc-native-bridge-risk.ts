import { definePostureRule } from "../../utils/define-posture-rule.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

export const localRpcNativeBridgeRisk = definePostureRule({
  id: "local-rpc-native-bridge-risk",
  title: "Weak localhost native bridge boundary",
  severity: "warn",
  recommendation:
    "Use exact origin allowlists after URL parsing, per-request nonces, narrow methods, and never expose install/update commands to arbitrary web pages.",
  scan: scanByPattern({
    shouldScan: (file) => isProductionSourcePath(file.relativePath),
    pattern:
      /\b(?:127\.0\.0\.1|localhost|Access-Control-Allow-Origin|websocket|WebSocket)\b[\s\S]{0,700}\b(?:includes|indexOf|endsWith|UpdateApp|InstallApp|install|update|exec|spawn)\b/i,
    message:
      "Code appears to bridge browser code to localhost/native capabilities with weak origin or update/install checks.",
  }),
});
