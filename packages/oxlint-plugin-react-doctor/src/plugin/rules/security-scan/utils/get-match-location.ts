import type { SourceLocation } from "./get-location-at-index.js";
import { getLocationAtIndex } from "./get-location-at-index.js";

export const getMatchLocation = (content: string, pattern: RegExp): SourceLocation =>
  getLocationAtIndex(content, content.search(pattern));
