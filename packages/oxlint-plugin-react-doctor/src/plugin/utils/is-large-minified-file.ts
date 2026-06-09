import * as fs from "node:fs";
import { MINIFIED_MIN_SIZE_BYTES } from "../constants/thresholds.js";
import { isMinifiedSource } from "./is-minified-source.js";

export const isLargeMinifiedFile = (absolutePath: string): boolean => {
  let sizeBytes: number;
  try {
    sizeBytes = fs.statSync(absolutePath).size;
  } catch {
    return false;
  }
  if (sizeBytes < MINIFIED_MIN_SIZE_BYTES) return false;
  return isMinifiedSource(absolutePath);
};
