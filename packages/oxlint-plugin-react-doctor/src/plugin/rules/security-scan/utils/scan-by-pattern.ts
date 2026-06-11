import type { FileScan, ScannedFile } from "../../../utils/file-scan.js";
import { getMatchLocation } from "./get-match-location.js";

export interface ScanByPatternInput {
  readonly shouldScan: (file: ScannedFile) => boolean;
  // One pattern, or a disjunction tried in order — the first pattern that
  // matches the file content locates the finding.
  readonly pattern: RegExp | ReadonlyArray<RegExp>;
  // Conjunction gates: every pattern must also match somewhere in the file
  // (e.g. an MCP import that proves the matched tool surface is MCP).
  readonly requireAll?: ReadonlyArray<RegExp>;
  // Veto: a match anywhere in the file suppresses the finding (e.g. a
  // signature-verification call that answers the rule's concern).
  readonly suppressWhen?: RegExp;
  readonly message: string;
}

export const scanByPattern =
  ({ shouldScan, pattern, requireAll, suppressWhen, message }: ScanByPatternInput): FileScan =>
  (file) => {
    if (!shouldScan(file)) return [];
    if (requireAll !== undefined && !requireAll.every((gate) => gate.test(file.content))) {
      return [];
    }
    const patterns = pattern instanceof RegExp ? [pattern] : pattern;
    const matchedPattern = patterns.find((candidate) => candidate.test(file.content));
    if (matchedPattern === undefined) return [];
    if (suppressWhen !== undefined && suppressWhen.test(file.content)) return [];
    const { line, column } = getMatchLocation(file.content, matchedPattern);
    return [{ message, line, column }];
  };
