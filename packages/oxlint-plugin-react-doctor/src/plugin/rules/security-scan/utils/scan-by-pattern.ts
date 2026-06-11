import { SOURCE_FILE_PATTERN } from "../../../constants/security-scan.js";
import type { FileScan, ScannedFile } from "../../../utils/file-scan.js";
import { getMatchLocation } from "./get-match-location.js";
import { stripCommentsPreservingPositions } from "./strip-comments-preserving-positions.js";

export interface ScanByPatternInput {
  readonly shouldScan: (file: ScannedFile) => boolean;
  readonly pattern: RegExp;
  readonly message: string;
}

const strippedContentCache = new WeakMap<ScannedFile, string>();

// Comments are a recurring false-positive source ("Ajv compiles schemas via
// `new Function(...)`"); blank them for JS/TS files before pattern matching.
// Stripping preserves offsets, so reported lines/columns stay correct.
export const getScannableContent = (file: ScannedFile): string => {
  if (!SOURCE_FILE_PATTERN.test(file.relativePath)) return file.content;
  const cachedContent = strippedContentCache.get(file);
  if (cachedContent !== undefined) return cachedContent;
  const strippedContent = stripCommentsPreservingPositions(file.content);
  strippedContentCache.set(file, strippedContent);
  return strippedContent;
};

export const scanByPattern =
  ({ shouldScan, pattern, message }: ScanByPatternInput): FileScan =>
  (file) => {
    if (!shouldScan(file)) return [];
    const content = getScannableContent(file);
    if (!pattern.test(content)) return [];
    const { line, column } = getMatchLocation(content, pattern);
    return [{ message, line, column }];
  };
