import { GENERATED_BUNDLE_FILE_PATTERN } from "../../../constants/security-posture.js";
import { isBrowserArtifactPath } from "./is-browser-artifact-path.js";

export const isPublicDebugArtifactPath = (relativePath: string): boolean =>
  isBrowserArtifactPath(relativePath, GENERATED_BUNDLE_FILE_PATTERN.test(relativePath)) &&
  /(?:^|\/)(?:\.env(?:\.[^/]*)?|[^/]*(?:debug|crash|trace|stack|report|dump|phpinfo)[^/]*\.(?:txt|log|json|html?)|[^/]+\.log)$/i.test(
    relativePath,
  );
