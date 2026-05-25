import { deadCodeEntryResolvers } from "./entry-resolvers/index.js";
import type { DeadCodeEntryResolverInput } from "./types.js";

export const collectFrameworkEntryPatterns = (input: DeadCodeEntryResolverInput): string[] => {
  const entryPatterns = new Set<string>();

  for (const resolver of deadCodeEntryResolvers) {
    if (!resolver.isEnabled(input)) continue;

    for (const entryPattern of resolver.collectEntryPatterns(input)) {
      entryPatterns.add(entryPattern);
    }
  }

  return [...entryPatterns];
};
