import { expoConfigPluginEntryResolver } from "./expo-config-plugins.js";
import type { ReachabilityEntryResolver } from "../types.js";

export const reachabilityEntryResolvers: ReadonlyArray<ReachabilityEntryResolver> = [
  expoConfigPluginEntryResolver,
];
