import type { SourceLocation } from "./get-location-at-index.js";
import { getLocationAtIndex } from "./get-location-at-index.js";

export const getMatchLocation = (content: string, pattern: RegExp | undefined): SourceLocation =>
  getLocationAtIndex(content, pattern === undefined ? -1 : content.search(pattern));
