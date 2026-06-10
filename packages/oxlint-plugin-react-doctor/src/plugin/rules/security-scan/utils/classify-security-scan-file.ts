import { GENERATED_BUNDLE_FILE_PATTERN } from "../../../constants/security-scan.js";
import { isBrowserArtifactPath } from "./is-browser-artifact-path.js";
import { isConfigOrCiPath } from "./is-config-or-ci-path.js";
import { isFirebaseRulesPath } from "./is-firebase-rules-path.js";
import { isProbablyTextFile } from "./is-probably-text-file.js";
import { isRepositorySecretFilePath } from "./is-repository-secret-file-path.js";
import { isSqlPath } from "./is-sql-path.js";

// `isGeneratedBundleByName` is the filename-only bundle test; the walker
// still content-sniffs minified files afterwards before choosing the
// larger bundle size cap, so the two signals must stay separate.
export interface SecurityScanFileClassification {
  readonly bucket: "priority" | "artifact" | "other";
  readonly isGeneratedBundleByName: boolean;
}

// Pure path classification (no fs) used by the security-scan walker to
// order files priority → artifact → other and apply per-bucket file caps.
// Returns null for paths the scan never reads.
export const classifySecurityScanFile = (
  relativePath: string,
): SecurityScanFileClassification | null => {
  const isGeneratedBundleByName = GENERATED_BUNDLE_FILE_PATTERN.test(relativePath);
  if (
    isRepositorySecretFilePath(relativePath) ||
    isSqlPath(relativePath) ||
    isFirebaseRulesPath(relativePath) ||
    isConfigOrCiPath(relativePath)
  ) {
    return { bucket: "priority", isGeneratedBundleByName };
  }
  if (isBrowserArtifactPath(relativePath, isGeneratedBundleByName)) {
    return { bucket: "artifact", isGeneratedBundleByName };
  }
  if (isProbablyTextFile(relativePath)) return { bucket: "other", isGeneratedBundleByName };
  return null;
};

// Read gate the walker applies after the size caps: generated bundles are
// always read; everything else must look like text, config/CI, or a
// repository secret file.
export const shouldReadSecurityScanContent = (
  relativePath: string,
  isGeneratedBundle: boolean,
): boolean =>
  isGeneratedBundle ||
  isProbablyTextFile(relativePath) ||
  isConfigOrCiPath(relativePath) ||
  isRepositorySecretFilePath(relativePath);
