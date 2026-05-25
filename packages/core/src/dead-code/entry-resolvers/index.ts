import { expoConfigPluginEntryResolver } from "./expo-config-plugins.js";
import type { DeadCodeEntryResolver } from "../types.js";

export const deadCodeEntryResolvers: ReadonlyArray<DeadCodeEntryResolver> = [
  expoConfigPluginEntryResolver,
];

export { expoConfigPluginEntryResolver };
