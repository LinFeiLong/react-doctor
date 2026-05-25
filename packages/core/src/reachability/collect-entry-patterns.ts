import { reachabilityEntryResolvers } from "./entry-resolvers/index.js";
import type { ReachabilityEntryResolverInput } from "./types.js";

export const collectReachabilityEntryPatterns = (
  input: ReachabilityEntryResolverInput,
): string[] => {
  const entryPatterns = new Set<string>();

  for (const resolver of reachabilityEntryResolvers) {
    if (!resolver.isEnabled(input)) continue;

    for (const entryPattern of resolver.collectEntryPatterns(input)) {
      entryPatterns.add(entryPattern);
    }
  }

  return [...entryPatterns];
};
