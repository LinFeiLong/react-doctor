import { accessSync, constants, statSync } from "node:fs";
import path from "node:path";

// True when `command` resolves to an executable file on the current `PATH`.
// Shared by agent detection and the agent-handoff launcher so the
// "is this CLI installed?" check lives in one place.
export const isCommandAvailable = (command: string): boolean => {
  const pathDirectories = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const directory of pathDirectories) {
    const binaryPath = path.join(directory, command);
    try {
      if (statSync(binaryPath).isFile()) {
        accessSync(binaryPath, constants.X_OK);
        return true;
      }
    } catch {}
  }
  return false;
};
