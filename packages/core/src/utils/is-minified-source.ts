import fs from "node:fs";
import { MINIFIED_LINE_LENGTH_CHARS, MINIFIED_SNIFF_BYTES } from "../project-info/constants.js";

// Content sniff for minified / generated files that carry an ordinary
// source extension (e.g. a one-line `public/inject.js` bundle that the
// path-based `isLintableSourceFile` gate can't catch). Reads only a small
// prefix — a minified file's enormous lines show up immediately, so we
// never read the whole bundle — & flags the file when any line in that
// prefix exceeds the minified-line threshold. Returns false on any read
// error so an unreadable file is simply scanned as usual.
export const isMinifiedSource = (absolutePath: string): boolean => {
  let fileDescriptor: number | undefined;
  try {
    fileDescriptor = fs.openSync(absolutePath, "r");
    const buffer = Buffer.alloc(MINIFIED_SNIFF_BYTES);
    const bytesRead = fs.readSync(fileDescriptor, buffer, 0, MINIFIED_SNIFF_BYTES, 0);
    const longestLineLength = buffer
      .toString("utf8", 0, bytesRead)
      .split("\n")
      .reduce((longest, line) => Math.max(longest, line.length), 0);
    return longestLineLength > MINIFIED_LINE_LENGTH_CHARS;
  } catch {
    return false;
  } finally {
    if (fileDescriptor !== undefined) fs.closeSync(fileDescriptor);
  }
};
