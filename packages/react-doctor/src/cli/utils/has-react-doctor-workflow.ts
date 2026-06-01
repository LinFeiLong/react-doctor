import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Matches a workflow referencing React Doctor (the action, an `npx react-doctor`
// step, or a "React Doctor" job name).
const REACT_DOCTOR_REFERENCE = /react[- ]doctor/i;

const directoryHasReactDoctorWorkflow = (directory: string): boolean => {
  const workflowsDirectory = path.join(directory, ".github", "workflows");
  if (!existsSync(workflowsDirectory)) return false;
  let entries: string[];
  try {
    entries = readdirSync(workflowsDirectory);
  } catch {
    return false;
  }
  return entries.some((entry) => {
    if (!entry.endsWith(".yml") && !entry.endsWith(".yaml")) return false;
    try {
      return REACT_DOCTOR_REFERENCE.test(
        readFileSync(path.join(workflowsDirectory, entry), "utf8"),
      );
    } catch {
      return false;
    }
  });
};

// True when a workflow referencing react-doctor exists in the scan dir or any
// ancestor up to the repo root. Walks up so a monorepo package finds the
// workflow above it. Suppresses the "set up CI/CD" tip.
export const hasReactDoctorWorkflow = (scanDirectory: string): boolean => {
  let currentDirectory = path.resolve(scanDirectory);
  while (true) {
    if (directoryHasReactDoctorWorkflow(currentDirectory)) return true;
    // Stop at the repo root (already checked above).
    if (existsSync(path.join(currentDirectory, ".git"))) return false;
    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) return false;
    currentDirectory = parentDirectory;
  }
};
