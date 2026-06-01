import fs from "node:fs";
import path from "node:path";
import { isFile } from "../../../project-info/index.js";

// expo-doctor evaluates the *resolved* app config by executing
// `app.config.js` and merging it with `app.json`. A static analyzer can't
// run user config, so this reader applies the reliable subset:
//   - JSON forms (`app.json` / `app.config.json`) are parsed; Expo nests
//     the config under an `expo` key in `app.json`, so we unwrap it.
//   - JS/TS forms (`app.config.{js,ts,cjs,mjs}`) can be arbitrary code, so
//     we keep their raw text for conservative regex checks only.
// A finding that depends on a value only present in a dynamic JS config is
// a known false-negative (documented per check), never a false positive.
const APP_CONFIG_JSON_FILES = ["app.json", "app.config.json"] as const;
const APP_CONFIG_TEXT_FILES = [
  "app.config.js",
  "app.config.ts",
  "app.config.cjs",
  "app.config.mjs",
] as const;

export interface ExpoAppConfig {
  /** Parsed `expo` config object from a JSON app config, or null. */
  readonly config: Record<string, unknown> | null;
  /** Raw text of any JS/TS app config files (for regex-only checks). */
  readonly text: string;
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
  let config: Record<string, unknown> | null = null;
  for (const fileName of APP_CONFIG_JSON_FILES) {
    const filePath = path.join(rootDirectory, fileName);
    if (!isFile(filePath)) continue;
    const contents = readFileSafe(filePath);
    if (contents === null) continue;
    try {
      config = unwrapExpoConfig(JSON.parse(contents));
    } catch {
      config = null;
    }
    if (config) break;
  }

  let text = "";
  for (const fileName of APP_CONFIG_TEXT_FILES) {
    const filePath = path.join(rootDirectory, fileName);
    if (!isFile(filePath)) continue;
    const contents = readFileSafe(filePath);
    if (contents !== null) text += `${contents}\n`;
  }

  return { config, text };
};

// Reads a nested boolean off the parsed config, e.g. `expo.updates.x`.
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
