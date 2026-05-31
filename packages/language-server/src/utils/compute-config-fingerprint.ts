import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CONFIG_WATCH_FILENAMES } from "../constants.js";

/**
 * Fingerprint of everything (outside file content) that affects lint
 * output for a project: the React Doctor version plus the size + mtime of
 * each config / manifest / lockfile. A change to any of them invalidates
 * the persisted per-file lint cache, since rules, capabilities, adopted
 * configs, and dependency-derived settings all flow from these files.
 */
export const computeConfigFingerprint = (projectDirectory: string, version: string): string => {
  const parts: string[] = [`v=${version}`];
  for (const filename of CONFIG_WATCH_FILENAMES) {
    try {
      const stat = fs.statSync(path.join(projectDirectory, filename));
      parts.push(`${filename}=${stat.mtimeMs}:${stat.size}`);
    } catch {
      parts.push(`${filename}=absent`);
    }
  }
  return crypto.createHash("sha1").update(parts.join("|")).digest("hex");
};
