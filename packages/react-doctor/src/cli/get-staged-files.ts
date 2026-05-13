import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { GIT_SHOW_MAX_BUFFER_BYTES, SOURCE_FILE_PATTERN } from "../constants.js";

const getStagedFilePaths = (directory: string): string[] => {
  const result = spawnSync(
    "git",
    ["diff", "--cached", "-z", "--name-only", "--diff-filter=ACMR", "--relative"],
    { cwd: directory, stdio: "pipe", maxBuffer: GIT_SHOW_MAX_BUFFER_BYTES },
  );
  if (result.error || result.status !== 0) return [];
  const output = result.stdout.toString();
  if (!output) return [];
  return output.split("\0").filter((filePath) => filePath.length > 0);
};

const readStagedContent = (directory: string, relativePath: string): string | null => {
  const result = spawnSync("git", ["show", `:${relativePath}`], {
    cwd: directory,
    stdio: "pipe",
    maxBuffer: GIT_SHOW_MAX_BUFFER_BYTES,
  });
  if (result.error || result.status !== 0) return null;
  return result.stdout.toString();
};

export interface StagedSnapshot {
  tempDirectory: string;
  stagedFiles: string[];
  cleanup: () => void;
}

export const getStagedSourceFiles = (directory: string): string[] =>
  getStagedFilePaths(directory).filter((filePath) => SOURCE_FILE_PATTERN.test(filePath));

const PROJECT_CONFIG_FILENAMES = [
  "tsconfig.json",
  "tsconfig.base.json",
  "package.json",
  "pnpm-workspace.yaml",
  "react-doctor.config.json",
  "knip.json",
  "knip.jsonc",
  ".knip.json",
  ".knip.jsonc",
  "oxlint.json",
  ".oxlintrc.json",
];

const collectConfigFilePaths = (stagedFiles: string[]): string[] => {
  const configFilePaths = new Set(PROJECT_CONFIG_FILENAMES);
  for (const stagedFile of stagedFiles) {
    let directory = path.dirname(stagedFile);
    while (directory !== ".") {
      for (const configFilename of PROJECT_CONFIG_FILENAMES) {
        configFilePaths.add(path.join(directory, configFilename));
      }
      const parentDirectory = path.dirname(directory);
      if (parentDirectory === directory) break;
      directory = parentDirectory;
    }
  }
  return [...configFilePaths].sort();
};

const resolveSafeStagedTargetPath = (
  tempDirectory: string,
  relativePath: string,
): string | null => {
  if (path.isAbsolute(relativePath)) return null;
  const normalizedTempDirectory = path.resolve(tempDirectory);
  const targetPath = path.resolve(normalizedTempDirectory, relativePath);
  const relativeToTemp = path.relative(normalizedTempDirectory, targetPath);
  if (relativeToTemp.startsWith("..") || path.isAbsolute(relativeToTemp)) return null;
  return targetPath;
};

export const materializeStagedFiles = (
  directory: string,
  stagedFiles: string[],
  tempDirectory: string,
): StagedSnapshot => {
  const materializedFiles: string[] = [];

  for (const relativePath of stagedFiles) {
    const content = readStagedContent(directory, relativePath);
    if (content === null) continue;
    const targetPath = resolveSafeStagedTargetPath(tempDirectory, relativePath);
    if (!targetPath) continue;
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content);
    materializedFiles.push(relativePath);
  }

  for (const configFilePath of collectConfigFilePaths(stagedFiles)) {
    const targetPath = resolveSafeStagedTargetPath(tempDirectory, configFilePath);
    if (!targetPath) continue;
    if (fs.existsSync(targetPath)) continue;
    const stagedContent = readStagedContent(directory, configFilePath);
    if (stagedContent !== null) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, stagedContent);
      continue;
    }
    const sourcePath = path.join(directory, configFilePath);
    if (fs.existsSync(sourcePath)) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.cpSync(sourcePath, targetPath);
    }
  }

  return {
    tempDirectory,
    stagedFiles: materializedFiles,
    cleanup: () => {
      try {
        fs.rmSync(tempDirectory, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup.
      }
    },
  };
};
