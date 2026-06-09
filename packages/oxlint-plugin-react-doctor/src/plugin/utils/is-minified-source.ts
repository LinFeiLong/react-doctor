import * as fs from "node:fs";
import {
  MINIFIED_AVG_LINE_LENGTH_CHARS,
  MINIFIED_MAX_LINE_LENGTH_CHARS,
  MINIFIED_SNIFF_BYTES,
} from "../constants/thresholds.js";

export const isMinifiedSource = (absolutePath: string): boolean => {
  let fileDescriptor: number | undefined;
  try {
    fileDescriptor = fs.openSync(absolutePath, "r");
    const buffer = Buffer.alloc(MINIFIED_SNIFF_BYTES);
    const bytesRead = fs.readSync(fileDescriptor, buffer, 0, MINIFIED_SNIFF_BYTES, 0);
    const prefix = buffer.toString("utf8", 0, bytesRead);
    const lines = prefix.split("\n");
    const longestLineLength = lines.reduce((longest, line) => Math.max(longest, line.length), 0);
    const averageLineLength = prefix.length / lines.length;
    return (
      longestLineLength > MINIFIED_MAX_LINE_LENGTH_CHARS &&
      averageLineLength > MINIFIED_AVG_LINE_LENGTH_CHARS
    );
  } catch {
    return false;
  } finally {
    if (fileDescriptor !== undefined) fs.closeSync(fileDescriptor);
  }
};
