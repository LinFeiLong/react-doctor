import type { PostureFinding, ScannedFile } from "../plugin/utils/posture-scan.js";
import type { Rule } from "../plugin/utils/rule.js";

export interface PostureFileInput {
  relativePath: string;
  content: string;
  // Mirrors the walker's bundle classification (filename pattern or
  // minified-content sniff); defaults to false like an ordinary source file.
  isGeneratedBundle?: boolean;
}

// Pure-TS posture-rule runner mirroring what @react-doctor/core's
// check-security-posture environment check does at runtime: build an
// in-memory `ScannedFile` for one candidate file and hand it to the rule's
// `scan`. Used by `<rule>.regressions.test.ts` to assert finding semantics
// without touching the filesystem.
export const runPostureRule = (rule: Rule, file: PostureFileInput): PostureFinding[] => {
  const { scan } = rule;
  if (typeof scan !== "function") {
    throw new Error(`Rule "${rule.id}" has no posture scan; runPostureRule only runs scan rules.`);
  }
  const scannedFile: ScannedFile = {
    absolutePath: `/${file.relativePath}`,
    relativePath: file.relativePath,
    content: file.content,
    isGeneratedBundle: file.isGeneratedBundle ?? false,
  };
  return scan(scannedFile);
};
