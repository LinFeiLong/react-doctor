import type { ScanFinding, ScannedFile } from "../../../utils/file-scan.js";
import { getMatchLocation } from "./get-match-location.js";
import { isBrowserArtifactPath } from "./is-browser-artifact-path.js";

// Shared by `artifact-secret-leak` and `artifact-env-leak`: both gate on
// the same browser-artifact path test and report one finding at the first
// match of whatever leak pattern the rule detects in the content.
export const scanArtifactLeak = (
  file: ScannedFile,
  findLeakPattern: (content: string) => RegExp | undefined,
  message: string,
): ScanFinding[] => {
  if (!isBrowserArtifactPath(file.relativePath, file.isGeneratedBundle)) return [];
  const leakPattern = findLeakPattern(file.content);
  if (leakPattern === undefined) return [];
  const location = getMatchLocation(file.content, leakPattern);
  return [{ message, line: location.line, column: location.column }];
};
