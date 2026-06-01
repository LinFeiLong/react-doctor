import fs from "node:fs";
import path from "node:path";
import { isFile } from "../../../project-info/index.js";

// The static Expo config forms a static analyzer can read are the JSON ones
// (`app.config.json` / `app.json`); Expo nests the config under an `expo` key
// in `app.json`, so we unwrap it.
//
// A dynamic `app.config.{js,ts,cjs,mjs}` is the source of truth when present:
// Expo reads the static config first, passes it into the dynamic config, and
// uses the dynamic file's RETURN value — so the dynamic file can override any
// value declared in `app.json` (a stale `newArchEnabled: false` /
// `disableAntiBrickingMeasures: true` there may be flipped at build time). We
// can't evaluate that file offline, so when one exists we treat the config as
// unknown (no diagnostics) rather than trust possibly-overridden `app.json`
// values. This is a documented false-negative, never a false positive.
const APP_CONFIG_JSON_FILES = ["app.config.json", "app.json"] as const;
const APP_CONFIG_DYNAMIC_FILES = [
  "app.config.ts",
  "app.config.js",
  "app.config.cjs",
  "app.config.mjs",
] as const;

export interface ExpoAppConfig {
  /** Parsed `expo` config object from a JSON app config, or null. */
  readonly config: Record<string, unknown> | null;
  /** The file `config` was parsed from (so checks can report it), or null. */
  readonly configFile: string | null;
}

const readFileSafe = (filePath: string): string | null => {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
};

const unwrapExpoConfig = (parsed: unknown): Record<string, unknown> | null => {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const asRecord = parsed as Record<string, unknown>;
  const expoField = asRecord.expo;
  if (typeof expoField === "object" && expoField !== null && !Array.isArray(expoField)) {
    return expoField as Record<string, unknown>;
  }
  return asRecord;
};

export const readExpoAppConfig = (rootDirectory: string): ExpoAppConfig => {
  // A dynamic config can override anything in app.json and we can't evaluate
  // it offline, so don't trust the static JSON when one is present.
  const hasDynamicConfig = APP_CONFIG_DYNAMIC_FILES.some((fileName) =>
    isFile(path.join(rootDirectory, fileName)),
  );
  if (hasDynamicConfig) return { config: null, configFile: null };

  for (const fileName of APP_CONFIG_JSON_FILES) {
    const filePath = path.join(rootDirectory, fileName);
    if (!isFile(filePath)) continue;
    const contents = readFileSafe(filePath);
    if (contents === null) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(contents);
    } catch {
      continue;
    }
    const config = unwrapExpoConfig(parsed);
    if (config) return { config, configFile: fileName };
  }
  return { config: null, configFile: null };
};

// Reads a nested value off the parsed config, e.g. `expo.updates.x`.
export const getNestedConfigValue = (
  config: Record<string, unknown> | null,
  pathSegments: ReadonlyArray<string>,
): unknown => {
  let current: unknown = config;
  for (const segment of pathSegments) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};
