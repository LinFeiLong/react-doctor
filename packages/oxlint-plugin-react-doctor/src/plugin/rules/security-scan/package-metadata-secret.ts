import { SECRET_VALUE_PATTERNS } from "../../constants/security.js";
import { defineScanRule } from "../../utils/define-scan-rule.js";
import { findSuspiciousPublicEnvSecretNamePattern } from "./utils/find-suspicious-public-env-secret-name.js";
import { getMatchLocation } from "./utils/get-match-location.js";

export const packageMetadataSecret = defineScanRule({
  id: "package-metadata-secret",
  title: "Secret-like package metadata",
  severity: "warn",
  recommendation:
    "Keep secrets out of package metadata and generated reports; they are often published to registries, logs, or browser artifacts.",
  scan: (file) => {
    if (!file.relativePath.endsWith("package.json")) return [];
    const pattern =
      findSuspiciousPublicEnvSecretNamePattern(file.content) ??
      SECRET_VALUE_PATTERNS.find((candidate) => candidate.test(file.content));
    if (pattern === undefined) return [];

    const location = getMatchLocation(file.content, pattern);
    return [
      {
        message: "Package metadata contains secret-like values or public env secret names.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
