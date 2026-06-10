import { defineScanRule } from "../../utils/define-scan-rule.js";
import type { ScanFinding } from "../../utils/file-scan.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { hasSecretValue } from "./utils/has-secret-value.js";
import { isPublicDebugArtifactPath } from "./utils/is-public-debug-artifact-path.js";

export const publicDebugArtifact = defineScanRule({
  id: "public-debug-artifact",
  title: "Public debug artifact",
  severity: "warn",
  recommendation:
    "Remove debug artifacts from public output; logs and dumps often reveal source paths, internal routes, tokens, or environment snapshots.",
  scan: (file) => {
    if (!isPublicDebugArtifactPath(file.relativePath)) return [];
    const location = getMatchLocation(file.content, undefined);
    const finding: ScanFinding = {
      message: "A browser-reachable debug, log, dump, report, or env artifact is present.",
      line: location.line,
      column: location.column,
    };
    // Secret-bearing debug artifacts escalate over the rule's default "warn".
    return [hasSecretValue(file.content) ? { ...finding, severity: "error" } : finding];
  },
});
