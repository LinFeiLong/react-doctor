import { definePostureRule } from "../../utils/define-posture-rule.js";
import { isConfigOrCiPath } from "./utils/is-config-or-ci-path.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

export const pluginUpdateTrustRisk = definePostureRule({
  id: "plugin-update-trust-risk",
  title: "Plugin or updater trust boundary risk",
  severity: "warn",
  recommendation:
    "Require signed updates/plugins, pin trusted repositories, verify hashes before execution, and keep custom repository installs behind explicit warnings.",
  scan: scanByPattern({
    shouldScan: (file) =>
      isProductionSourcePath(file.relativePath) || isConfigOrCiPath(file.relativePath),
    pattern:
      /\b(?:repoUrl|updateUrl|UpdateApp|InstallApp|auto.?update|download|installer|curl|wget)\b[\s\S]{0,700}\b(?:https?:\/\/|\binstall(?:er)?\b|\bupdate\b|\bbinary\b|\.zip\b|\.exe\b|\.dmg\b|\.appimage\b)/i,
    message:
      "Code appears to download, install, update, or execute plugin/updater content across a trust boundary.",
  }),
});
