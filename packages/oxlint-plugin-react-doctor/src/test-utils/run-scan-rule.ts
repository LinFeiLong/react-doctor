import type { ScanFinding, ScannedFile } from "../plugin/utils/file-scan.js";
import type { Rule } from "../plugin/utils/rule.js";

export interface ScanFileInput {
  relativePath: string;
  content: string;
  // Mirrors the walker's bundle classification (filename pattern or
  // minified-content sniff); defaults to false like an ordinary source file.
  isGeneratedBundle?: boolean;
}

// Pure-TS scan-rule runner mirroring what @react-doctor/core's
// check-security-scan environment check does at runtime: build an
// in-memory `ScannedFile` for one candidate file and hand it to the rule's
// `scan`. Used by `<rule>.regressions.test.ts` to assert finding semantics
// without touching the filesystem.
export const runScanRule = (rule: Rule, file: ScanFileInput): ScanFinding[] => {
  const { scan } = rule;
  if (typeof scan !== "function") {
    throw new Error(`Rule "${rule.id}" has no scan; runScanRule only runs scan rules.`);
  }
  const scannedFile: ScannedFile = {
    absolutePath: `/${file.relativePath}`,
    relativePath: file.relativePath,
    content: file.content,
    isGeneratedBundle: file.isGeneratedBundle ?? false,
  };
  return scan(scannedFile);
};
