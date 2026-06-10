import type { FileScan, ScannedFile } from "../../../utils/file-scan.js";
import { getMatchLocation } from "./get-match-location.js";

export interface ScanByPatternInput {
  readonly shouldScan: (file: ScannedFile) => boolean;
  readonly pattern: RegExp;
  readonly message: string;
}

export const scanByPattern =
  ({ shouldScan, pattern, message }: ScanByPatternInput): FileScan =>
  (file) => {
    if (!shouldScan(file)) return [];
    if (!pattern.test(file.content)) return [];
    const { line, column } = getMatchLocation(file.content, pattern);
    return [{ message, line, column }];
  };
