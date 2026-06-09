import * as fs from "node:fs";
import * as path from "node:path";
import {
  classifySecurityPostureFile,
  shouldReadSecurityPostureContent,
} from "oxlint-plugin-react-doctor";
import type { ScannedFile } from "oxlint-plugin-react-doctor";
import { readDirectoryEntries } from "../../project-info/utils/read-directory-entries.js";
import { isLargeMinifiedFile } from "../../utils/is-large-minified-file.js";
import {
  SECURITY_SCAN_MAX_BUNDLE_FILE_SIZE_BYTES,
  SECURITY_SCAN_MAX_DIRECTORY_DEPTH,
  SECURITY_SCAN_MAX_FILES,
  SECURITY_SCAN_MAX_FILE_SIZE_BYTES,
  SKIPPED_DIRECTORY_NAMES,
} from "./constants.js";

interface DirectoryStackEntry {
  readonly absolutePath: string;
  readonly depth: number;
}

const readScannedFile = (
  absolutePath: string,
  relativePath: string,
  isGeneratedBundleByName: boolean,
): ScannedFile | null => {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(absolutePath);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;

  const isGeneratedBundle = isGeneratedBundleByName || isLargeMinifiedFile(absolutePath);
  const maxSizeBytes = isGeneratedBundle
    ? SECURITY_SCAN_MAX_BUNDLE_FILE_SIZE_BYTES
    : SECURITY_SCAN_MAX_FILE_SIZE_BYTES;
  if (stat.size > maxSizeBytes) return null;
  if (!shouldReadSecurityPostureContent(relativePath, isGeneratedBundle)) return null;

  try {
    return {
      absolutePath,
      relativePath,
      content: fs.readFileSync(absolutePath, "utf-8"),
      isGeneratedBundle,
    };
  } catch {
    return null;
  }
};

// Bounded whole-tree walk feeding the security-posture rules: files are
// bucketed priority → artifact → other by `classifySecurityPostureFile`
// (each bucket capped at SECURITY_SCAN_MAX_FILES) so config/secret files
// and shipped browser artifacts survive the cap on huge repositories.
export const collectSecurityPostureFiles = (rootDirectory: string): ScannedFile[] => {
  const priorityFiles: ScannedFile[] = [];
  const artifactFiles: ScannedFile[] = [];
  const otherFiles: ScannedFile[] = [];
  const stack: DirectoryStackEntry[] = [{ absolutePath: rootDirectory, depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    if (current.depth > SECURITY_SCAN_MAX_DIRECTORY_DEPTH) continue;

    const entries = readDirectoryEntries(current.absolutePath);
    for (const entry of entries) {
      const absolutePath = path.join(current.absolutePath, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
          stack.push({ absolutePath, depth: current.depth + 1 });
        }
        continue;
      }

      const relativePath = path.relative(rootDirectory, absolutePath).replaceAll("\\", "/");
      const classification = classifySecurityPostureFile(relativePath);
      if (classification === null) continue;
      const bucketFiles =
        classification.bucket === "priority"
          ? priorityFiles
          : classification.bucket === "artifact"
            ? artifactFiles
            : otherFiles;
      if (bucketFiles.length >= SECURITY_SCAN_MAX_FILES) continue;

      const scannedFile = readScannedFile(
        absolutePath,
        relativePath,
        classification.isGeneratedBundleByName,
      );
      if (scannedFile !== null) bucketFiles.push(scannedFile);
    }
  }

  return [...priorityFiles, ...artifactFiles, ...otherFiles];
};
