import { defineRule } from "../../utils/define-rule.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

export const importMetadataExecutionRisk = defineRule({
  id: "import-metadata-execution-risk",
  title: "Imported metadata reaches code execution",
  severity: "error",
  recommendation:
    "Parse imported metadata as data with strict schemas; do not evaluate EXIF, manifests, presets, dropped files, or archives.",
  scan: scanByPattern({
    shouldScan: (file) => isProductionSourcePath(file.relativePath),
    pattern:
      /(?:\b(?:eval|new Function|vm\.runIn|Lua|python|exec|spawn)\b|<script\b)[\s\S]{0,700}\b(?:exif|metadata|manifest|preset|plugin|upload|drop|archive|zip|import|restore)\b/i,
    message: "Imported metadata, uploads, or plugin manifests appear to reach code execution.",
  }),
});
