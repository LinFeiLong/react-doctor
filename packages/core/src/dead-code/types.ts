import type { ProjectInfo } from "../types/index.js";

export interface DeadCodeEntryResolverInput {
  readonly rootDirectory: string;
  readonly project?: ProjectInfo;
}

export interface DeadCodeEntryResolver {
  readonly id: string;
  readonly isEnabled: (input: DeadCodeEntryResolverInput) => boolean;
  readonly collectEntryPatterns: (input: DeadCodeEntryResolverInput) => string[];
}
