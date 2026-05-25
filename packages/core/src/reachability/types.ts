import type { ProjectInfo } from "../types/index.js";

export interface ReachabilityEntryResolverInput {
  readonly rootDirectory: string;
  readonly project?: ProjectInfo;
}

export interface ReachabilityEntryResolver {
  readonly id: string;
  readonly isEnabled: (input: ReachabilityEntryResolverInput) => boolean;
  readonly collectEntryPatterns: (input: ReachabilityEntryResolverInput) => string[];
}
