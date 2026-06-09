import { definePostureRule } from "../../utils/define-posture-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isConfigOrCiPath } from "./utils/is-config-or-ci-path.js";

export const buildPipelineSecretBoundary = definePostureRule({
  id: "build-pipeline-secret-boundary",
  title: "Build pipeline runs code near secrets",
  severity: "warn",
  recommendation:
    "Run dependency installs with scripts disabled before exposing secrets, isolate untrusted build code, and move signing/deploy authority into a narrow privileged step.",
  scan: (file) => {
    if (!isConfigOrCiPath(file.relativePath)) return [];

    const ciInstallNearSecretPattern =
      /(?:npm|pnpm|yarn|bun)\s+(?:install|ci)\b(?:(?!--ignore-scripts)[\s\S]){0,700}\bsecrets\.[A-Z0-9_]+|\bsecrets\.[A-Z0-9_]+(?:(?!--ignore-scripts)[\s\S]){0,700}(?:npm|pnpm|yarn|bun)\s+(?:install|ci)\b/i;
    const pattern = file.relativePath.endsWith("package.json") ? null : ciInstallNearSecretPattern;

    if (pattern === null || !pattern.test(file.content)) return [];

    const location = getMatchLocation(file.content, pattern);
    return [
      {
        message:
          "The build or install pipeline can execute package lifecycle code while CI secrets may be present.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
