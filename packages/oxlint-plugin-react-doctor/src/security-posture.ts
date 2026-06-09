import * as fs from "node:fs";
import * as path from "node:path";
import {
  GENERATED_BUNDLE_FILE_PATTERN,
  SECURITY_SCAN_MAX_BUNDLE_FILE_SIZE_BYTES,
  SECURITY_SCAN_MAX_DIRECTORY_DEPTH,
  SECURITY_SCAN_MAX_FILES,
  SECURITY_SCAN_MAX_FILE_SIZE_BYTES,
} from "./plugin/constants/thresholds.js";
import { reactDoctorRules } from "./plugin/rule-registry.js";
import {
  classifySecurityPostureFile,
  shouldReadSecurityPostureContent,
} from "./plugin/rules/security-posture/utils/classify-security-posture-file.js";
import { isLargeMinifiedFile } from "./plugin/utils/is-large-minified-file.js";
import { normalizeFilename } from "./plugin/utils/normalize-filename.js";
import type { ScannedFile } from "./plugin/utils/posture-scan.js";
import { readDirectoryEntries } from "./plugin/utils/read-directory-entries.js";

export interface SecurityPostureDiagnostic {
  readonly filePath: string;
  readonly plugin: "react-doctor";
  readonly rule: string;
  readonly severity: "error" | "warning";
  readonly title: string;
  readonly message: string;
  readonly help: string;
  readonly line: number;
  readonly column: number;
  readonly category: "Security";
}

interface DirectoryStackEntry {
  readonly absolutePath: string;
  readonly depth: number;
}

const SKIPPED_DIRECTORY_NAMES = new Set([
  ".git",
  ".turbo",
  ".vercel",
  "coverage",
  "node_modules",
  "tmp",
]);

const readScannedFile = (absolutePath: string, rootDirectory: string): ScannedFile | null => {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(absolutePath);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;

  const relativePath = normalizeFilename(path.relative(rootDirectory, absolutePath));
  const isGeneratedBundle =
    GENERATED_BUNDLE_FILE_PATTERN.test(relativePath) || isLargeMinifiedFile(absolutePath);
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

const collectScannedFiles = (rootDirectory: string): ScannedFile[] => {
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

      const relativePath = normalizeFilename(path.relative(rootDirectory, absolutePath));
      const classification = classifySecurityPostureFile(relativePath);
      if (classification === null) continue;
      const bucketFiles =
        classification.bucket === "priority"
          ? priorityFiles
          : classification.bucket === "artifact"
            ? artifactFiles
            : otherFiles;
      if (bucketFiles.length >= SECURITY_SCAN_MAX_FILES) continue;

      const scannedFile = readScannedFile(absolutePath, rootDirectory);
      if (scannedFile !== null) bucketFiles.push(scannedFile);
    }
  }

  return [...priorityFiles, ...artifactFiles, ...otherFiles];
};

// Temporary dispatcher: walks the tree and runs every registry rule that
// carries a posture `scan`. @react-doctor/core's check-security-posture
// environment check takes over both the walk and the dispatch in a later
// phase; only the walker above should outlive this file.
export const checkSecurityPosture = (rootDirectory: string): SecurityPostureDiagnostic[] => {
  const diagnostics: SecurityPostureDiagnostic[] = [];
  const seen = new Set<string>();
  const files = collectScannedFiles(rootDirectory);

  for (const file of files) {
    for (const entry of reactDoctorRules) {
      const scan = entry.rule.scan;
      if (typeof scan !== "function") continue;
      for (const finding of scan(file)) {
        const diagnostic: SecurityPostureDiagnostic = {
          filePath: file.relativePath,
          plugin: "react-doctor",
          rule: entry.id,
          severity: (finding.severity ?? entry.rule.severity) === "warn" ? "warning" : "error",
          title: finding.title ?? entry.rule.title ?? entry.id,
          message: finding.message,
          help: finding.help ?? entry.rule.recommendation ?? "",
          line: finding.line,
          column: finding.column,
          category: "Security",
        };
        const key = `${diagnostic.rule}:${diagnostic.filePath}:${diagnostic.line}:${diagnostic.column}:${diagnostic.message}`;
        if (seen.has(key)) continue;
        seen.add(key);
        diagnostics.push(diagnostic);
      }
    }
  }

  return diagnostics;
};
