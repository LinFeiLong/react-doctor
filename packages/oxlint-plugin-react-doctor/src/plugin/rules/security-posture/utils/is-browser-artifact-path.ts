import { BROWSER_ARTIFACT_PATH_PATTERNS } from "../../../constants/security-posture.js";

const isServerOnlyBuildArtifactPath = (relativePath: string): boolean =>
  /(?:^|\/)(?:\.next\/server|\.output\/server)\//.test(relativePath);

export const isBrowserArtifactPath = (
  relativePath: string,
  isGeneratedBundle: boolean,
): boolean => {
  if (isServerOnlyBuildArtifactPath(relativePath)) return false;
  if (isGeneratedBundle) return true;
  if (relativePath.endsWith(".map")) return true;
  return BROWSER_ARTIFACT_PATH_PATTERNS.some((pattern) => pattern.test(relativePath));
};
