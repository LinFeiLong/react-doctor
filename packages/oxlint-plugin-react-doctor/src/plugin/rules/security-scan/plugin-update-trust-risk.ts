import { SOURCE_FILE_PATTERN } from "../../constants/security-scan.js";
import { defineRule } from "../../utils/define-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isConfigOrCiPath } from "./utils/is-config-or-ci-path.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";
import { getScannableContent } from "./utils/scan-by-pattern.js";

// `download` near `https://` matches every download link; require an
// updater-shaped trigger plus an executable artifact or pipe-to-shell close
// by (instructional `curl ... | sh` strings shown in onboarding UIs sit far
// from any artifact, and a 700-char window bled across unrelated code).
const UPDATER_TRUST_PATTERN =
  /\b(?:repoUrl|updateUrl|UpdateApp|InstallApp|auto.?updater?|installer|curl|wget)\b[\s\S]{0,250}(?:\.(?:zip|exe|dmg|appimage|msi|deb|rpm)\b|\.tar\.gz\b|\bbinary\b|\bchmod\b|\|\s*(?:bash|sh)\b)/i;

// Source files that only DISPLAY install commands (docs components, snippet
// generators) never execute them; require a process-execution surface.
const EXECUTION_CONTEXT_PATTERN =
  /\b(?:child_process|childProcess|execa|os\.system|subprocess\.|Deno\.run|autoUpdater|electron-updater)\b|\b(?:exec(?:File)?(?:Sync)?|spawn(?:Sync)?)\s*\(/;

export const pluginUpdateTrustRisk = defineRule({
  id: "plugin-update-trust-risk",
  title: "Plugin or updater trust boundary risk",
  severity: "warn",
  recommendation:
    "Require signed updates/plugins, pin trusted repositories, verify hashes before execution, and keep custom repository installs behind explicit warnings.",
  scan: (file) => {
    if (!isProductionSourcePath(file.relativePath) && !isConfigOrCiPath(file.relativePath)) {
      return [];
    }
    const content = getScannableContent(file);
    if (!UPDATER_TRUST_PATTERN.test(content)) return [];
    if (SOURCE_FILE_PATTERN.test(file.relativePath) && !EXECUTION_CONTEXT_PATTERN.test(content)) {
      return [];
    }
    const location = getMatchLocation(content, UPDATER_TRUST_PATTERN);
    return [
      {
        message:
          "Code appears to download, install, update, or execute plugin/updater content across a trust boundary.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
