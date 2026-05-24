import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  ensureTrailingNewline,
  getPackageJsonPath,
  isRecord,
  NON_BLOCKING_REACT_DOCTOR_COMMAND,
  REACT_DOCTOR_COMMAND,
  readPackageJson,
  writeJsonFile,
} from "./git-hook-shared.js";
import {
  GitHookKind,
  type InstallGitHookOptions,
  type InstallGitHookResult,
} from "./git-hook-types.js";
import { removeLegacyManagedRunner } from "./install-git-hook-file.js";

export const installSimpleGitHooks = (options: InstallGitHookOptions): InstallGitHookResult => {
  const packageJsonPath = getPackageJsonPath(options.projectRoot);
  const didHookExist = existsSync(packageJsonPath);
  const packageJson = readPackageJson(options.projectRoot);
  const nextPackageJson = isRecord(packageJson) ? { ...packageJson } : {};
  const existingConfig = nextPackageJson["simple-git-hooks"];
  const nextConfig = isRecord(existingConfig) ? { ...existingConfig } : {};
  const existingPreCommit =
    typeof nextConfig["pre-commit"] === "string" ? nextConfig["pre-commit"] : "";
  const nextPreCommit = existingPreCommit.includes(REACT_DOCTOR_COMMAND)
    ? existingPreCommit
    : [existingPreCommit, NON_BLOCKING_REACT_DOCTOR_COMMAND].filter(Boolean).join("\n");
  nextConfig["pre-commit"] = nextPreCommit;
  nextPackageJson["simple-git-hooks"] = nextConfig;
  writeJsonFile(packageJsonPath, nextPackageJson);
  removeLegacyManagedRunner(options.projectRoot);

  return {
    hookPath: packageJsonPath,
    kind: GitHookKind.SimpleGitHooks,
    status: didHookExist ? "updated" : "created",
  };
};

const appendStringCommand = (existingCommand: unknown): string => {
  const existingCommandText =
    typeof existingCommand === "string"
      ? existingCommand
      : Array.isArray(existingCommand)
        ? existingCommand.filter((entry) => typeof entry === "string").join("\n")
        : "";
  return existingCommandText.includes(REACT_DOCTOR_COMMAND)
    ? existingCommandText
    : [existingCommandText, NON_BLOCKING_REACT_DOCTOR_COMMAND].filter(Boolean).join("\n");
};

const appendArrayCommand = (existingCommands: unknown): string[] => {
  const commands = Array.isArray(existingCommands)
    ? existingCommands.filter((entry): entry is string => typeof entry === "string")
    : typeof existingCommands === "string"
      ? [existingCommands]
      : [];
  return commands.some((command) => command.includes(REACT_DOCTOR_COMMAND))
    ? commands
    : [...commands, NON_BLOCKING_REACT_DOCTOR_COMMAND];
};

export const installPackageJsonPreCommitString = (
  options: InstallGitHookOptions,
  kind: GitHookKind,
  configKey: string,
): InstallGitHookResult => {
  const packageJsonPath = getPackageJsonPath(options.projectRoot);
  const didHookExist = existsSync(packageJsonPath);
  const packageJson = readPackageJson(options.projectRoot);
  const nextPackageJson = isRecord(packageJson) ? { ...packageJson } : {};
  const existingConfig = nextPackageJson[configKey];
  const nextConfig = isRecord(existingConfig) ? { ...existingConfig } : {};
  nextConfig["pre-commit"] = appendStringCommand(nextConfig["pre-commit"]);
  nextPackageJson[configKey] = nextConfig;
  writeJsonFile(packageJsonPath, nextPackageJson);
  removeLegacyManagedRunner(options.projectRoot);
  return {
    hookPath: packageJsonPath,
    kind,
    status: didHookExist ? "updated" : "created",
  };
};

export const installGhooks = (options: InstallGitHookOptions): InstallGitHookResult => {
  const packageJsonPath = getPackageJsonPath(options.projectRoot);
  const didHookExist = existsSync(packageJsonPath);
  const packageJson = readPackageJson(options.projectRoot);
  const nextPackageJson = isRecord(packageJson) ? { ...packageJson } : {};
  const existingConfig = nextPackageJson.config;
  const nextConfig = isRecord(existingConfig) ? { ...existingConfig } : {};
  const existingGhooks = nextConfig.ghooks;
  const nextGhooks = isRecord(existingGhooks) ? { ...existingGhooks } : {};
  nextGhooks["pre-commit"] = appendStringCommand(nextGhooks["pre-commit"]);
  nextConfig.ghooks = nextGhooks;
  nextPackageJson.config = nextConfig;
  writeJsonFile(packageJsonPath, nextPackageJson);
  removeLegacyManagedRunner(options.projectRoot);
  return {
    hookPath: packageJsonPath,
    kind: GitHookKind.Ghooks,
    status: didHookExist ? "updated" : "created",
  };
};

export const installPreCommitNpm = (options: InstallGitHookOptions): InstallGitHookResult => {
  const packageJsonPath = getPackageJsonPath(options.projectRoot);
  const didHookExist = existsSync(packageJsonPath);
  const packageJson = readPackageJson(options.projectRoot);
  const nextPackageJson = isRecord(packageJson) ? { ...packageJson } : {};
  nextPackageJson["pre-commit"] = appendArrayCommand(nextPackageJson["pre-commit"]);
  writeJsonFile(packageJsonPath, nextPackageJson);
  removeLegacyManagedRunner(options.projectRoot);
  return {
    hookPath: packageJsonPath,
    kind: GitHookKind.PreCommitNpm,
    status: didHookExist ? "updated" : "created",
  };
};

export const installPrettyQuick = (options: InstallGitHookOptions): InstallGitHookResult =>
  installPackageJsonPreCommitString(options, GitHookKind.PrettyQuick, "gitHooks");

const appendIndentedBlockToTopLevelSection = (
  content: string,
  sectionName: string,
  block: readonly string[],
): string => {
  const normalizedContent = ensureTrailingNewline(content);
  const sectionPattern = new RegExp(`^${sectionName}:\\s*$`, "m");
  const match = sectionPattern.exec(normalizedContent);
  if (match === null) {
    return ensureTrailingNewline(
      [normalizedContent.trimEnd(), "", `${sectionName}:`, ...block, ""]
        .filter((line, index) => index > 0 || line.length > 0)
        .join("\n"),
    );
  }

  const sectionStartIndex = match.index;
  const nextSectionPattern = /^[A-Za-z0-9_-]+:\s*$/gm;
  nextSectionPattern.lastIndex = sectionStartIndex + match[0].length;
  let nextSectionMatch = nextSectionPattern.exec(normalizedContent);
  while (nextSectionMatch !== null && nextSectionMatch.index === sectionStartIndex) {
    nextSectionMatch = nextSectionPattern.exec(normalizedContent);
  }

  const insertIndex = nextSectionMatch?.index ?? normalizedContent.length;
  const prefix = normalizedContent.slice(0, insertIndex).trimEnd();
  const suffix = normalizedContent.slice(insertIndex);
  return ensureTrailingNewline([prefix, ...block, suffix.trimStart()].join("\n"));
};

interface TopLevelSectionRange {
  readonly headerEndIndex: number;
  readonly contentEndIndex: number;
}

const findTopLevelSectionRange = (
  content: string,
  sectionName: string,
): TopLevelSectionRange | null => {
  const sectionPattern = new RegExp(`^${sectionName}:\\s*$`, "m");
  const match = sectionPattern.exec(content);
  if (match === null) return null;

  const headerLineEndIndex = content.indexOf("\n", match.index);
  const headerEndIndex =
    headerLineEndIndex === -1 ? match.index + match[0].length : headerLineEndIndex + 1;
  const nextSectionPattern = /^[A-Za-z0-9_-]+:\s*$/gm;
  nextSectionPattern.lastIndex = headerEndIndex;
  const nextSectionMatch = nextSectionPattern.exec(content);
  return {
    headerEndIndex,
    contentEndIndex: nextSectionMatch?.index ?? content.length,
  };
};

const appendLefthookCommand = (content: string): string => {
  const normalizedContent = ensureTrailingNewline(content);
  const sectionRange = findTopLevelSectionRange(normalizedContent, "pre-commit");
  const reactDoctorCommandBlock = [
    "    react-doctor:",
    `      run: ${NON_BLOCKING_REACT_DOCTOR_COMMAND}`,
    "",
  ];

  if (sectionRange === null) {
    return ensureTrailingNewline(
      [normalizedContent.trimEnd(), "", "pre-commit:", "  commands:", ...reactDoctorCommandBlock]
        .filter((line, index) => index > 0 || line.length > 0)
        .join("\n"),
    );
  }

  const sectionContent = normalizedContent.slice(
    sectionRange.headerEndIndex,
    sectionRange.contentEndIndex,
  );
  const commandsMatch = /^  commands:\s*$/m.exec(sectionContent);

  const insertIndex =
    commandsMatch === null
      ? sectionRange.headerEndIndex
      : sectionRange.headerEndIndex +
        sectionContent.indexOf(commandsMatch[0]) +
        commandsMatch[0].length +
        1;
  const insertBlock =
    commandsMatch === null
      ? ["  commands:", ...reactDoctorCommandBlock].join("\n")
      : reactDoctorCommandBlock.join("\n");

  return ensureTrailingNewline(
    `${normalizedContent.slice(0, insertIndex)}${insertBlock}${normalizedContent.slice(insertIndex)}`,
  );
};

export const installLefthook = (options: InstallGitHookOptions): InstallGitHookResult => {
  const didHookExist = existsSync(options.hookPath);
  const existingContent = didHookExist ? readFileSync(options.hookPath, "utf8") : "";
  if (!existingContent.includes("react-doctor")) {
    const nextContent = appendLefthookCommand(existingContent);
    mkdirSync(path.dirname(options.hookPath), { recursive: true });
    writeFileSync(options.hookPath, nextContent);
  }
  removeLegacyManagedRunner(options.projectRoot);

  return {
    hookPath: options.hookPath,
    kind: GitHookKind.Lefthook,
    status: didHookExist ? "updated" : "created",
  };
};

export const installPreCommit = (options: InstallGitHookOptions): InstallGitHookResult => {
  const didHookExist = existsSync(options.hookPath);
  const existingContent = didHookExist ? readFileSync(options.hookPath, "utf8") : "";
  if (!existingContent.includes("id: react-doctor")) {
    const hasReposKey = /^repos:\s*$/m.test(existingContent);
    const localHookBlock = [
      "  - repo: local",
      "    hooks:",
      "      - id: react-doctor",
      "        name: react-doctor",
      `        entry: sh -c '${NON_BLOCKING_REACT_DOCTOR_COMMAND}'`,
      "        language: system",
      "        pass_filenames: false",
      "",
    ].join("\n");
    const nextContent = hasReposKey
      ? `${ensureTrailingNewline(existingContent)}${localHookBlock}`
      : `repos:\n${localHookBlock}`;
    mkdirSync(path.dirname(options.hookPath), { recursive: true });
    writeFileSync(options.hookPath, nextContent);
  }
  removeLegacyManagedRunner(options.projectRoot);

  return {
    hookPath: options.hookPath,
    kind: GitHookKind.PreCommit,
    status: didHookExist ? "updated" : "created",
  };
};

export const installOvercommit = (options: InstallGitHookOptions): InstallGitHookResult => {
  const didHookExist = existsSync(options.hookPath);
  const existingContent = didHookExist ? readFileSync(options.hookPath, "utf8") : "";
  if (!existingContent.includes("ReactDoctor")) {
    const nextContent = appendIndentedBlockToTopLevelSection(existingContent, "PreCommit", [
      "  ReactDoctor:",
      "    enabled: true",
      `    command: ['sh', '-c', '${NON_BLOCKING_REACT_DOCTOR_COMMAND}']`,
      "",
    ]);
    mkdirSync(path.dirname(options.hookPath), { recursive: true });
    writeFileSync(options.hookPath, nextContent);
  }
  removeLegacyManagedRunner(options.projectRoot);
  return {
    hookPath: options.hookPath,
    kind: GitHookKind.Overcommit,
    status: didHookExist ? "updated" : "created",
  };
};
