import { defineRule } from "../../utils/define-rule.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

export const importMetadataExecutionRisk = defineRule({
  id: "import-metadata-execution-risk",
  title: "Imported metadata reaches code execution",
  severity: "error",
  recommendation:
    "Parse imported metadata as data with strict schemas; do not evaluate EXIF, manifests, presets, dropped files, or archives.",
  // The taint word must sit inside the execution call's own statement —
  // a window that crosses statements self-flags on unrelated `import` lines
  // (e.g. `import { exec } from "node:child_process"` followed by any import).
  // `(?<!["'])...(?!["'])` keeps quote-wrapped static arguments
  // (`spawnSync("claude", ["plugin", ...])`) from counting as taint — a
  // literal word is an argument value the attacker does not control.
  scan: scanByPattern({
    shouldScan: (file) => isProductionSourcePath(file.relativePath),
    pattern:
      /(?:\b(?:eval|new\s+Function|vm\.runIn\w*)|(?<![.\w$])(?:exec(?:File)?(?:Sync)?|spawn(?:Sync)?)|\b(?:child_process|childProcess|cp)\.(?:exec|spawn)\w*)\s*\([^;]{0,200}(?<!["'])\b(?:exif|metadata|manifest|preset|plugin|upload|drop(?:ped|s)?\b|archive|zip|unzip|untar)(?!\w*["'])/i,
    message: "Imported metadata, uploads, or plugin manifests appear to reach code execution.",
  }),
});
