import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { GIT_HOOK_EXECUTABLE_MODE } from "./constants.js";

export type GitHookKind =
  | "configured"
  | "ghooks"
  | "git"
  | "git-hooks-js"
  | "husky"
  | "lefthook"
  | "lint-staged"
  | "nano-staged"
  | "overcommit"
  | "pre-commit"
  | "pre-commit-npm"
  | "pretty-quick"
  | "simple-git-hooks"
  | "vite-plus"
  | "yorkie";

export interface GitHookTarget {
  readonly hookPath: string;
  readonly runnerRoot: string;
  readonly kind: GitHookKind;
  readonly hooksPathConfig?: string;
}

interface InstallGitHookOptions {
  readonly hookPath: string;
  readonly projectRoot: string;
  readonly kind?: GitHookKind;
  readonly hooksPathConfig?: string;
}

interface InstallGitHookResult {
  readonly hookPath: string;
  readonly kind: GitHookKind;
  readonly status: "created" | "updated";
}

const HOOK_FILE_NAME = "pre-commit";
const HOOK_RELATIVE_PATH = "hooks/pre-commit";
const LEGACY_HOOK_RUNNER_RELATIVE_PATH = ".react-doctor/hooks/pre-commit";
const HUSKY_HOOKS_PATH = ".husky";
const VITE_PLUS_HOOKS_PATH = ".vite-hooks";
const SIMPLE_GIT_HOOKS_PACKAGE_JSON_KEY = "simple-git-hooks";
const SIMPLE_GIT_HOOKS_CONFIG_FILE = ".simple-git-hooks.cjs";
const LEFTHOOK_CONFIG_FILES = ["lefthook.yml", "lefthook.yaml"];
const PRE_COMMIT_CONFIG_FILE = ".pre-commit-config.yaml";
const OVERCOMMIT_CONFIG_FILE = ".overcommit.yml";
const REACT_DOCTOR_COMMAND = "react-doctor --staged --fail-on none";
const NON_BLOCKING_REACT_DOCTOR_COMMAND = `${REACT_DOCTOR_COMMAND} || true`;
const PACKAGE_JSON_FILE_NAME = "package.json";
const REACT_DOCTOR_BLOCK_START = "# react-doctor hook start";
const REACT_DOCTOR_BLOCK_END = "# react-doctor hook end";
const LEGACY_MANAGED_BLOCK_START = "# react-doctor hook launcher start";
const LEGACY_MANAGED_BLOCK_END = "# react-doctor hook launcher end";
const REACT_DOCTOR_BLOCK_PATTERN = new RegExp(
  `(?:${REACT_DOCTOR_BLOCK_START}[\\s\\S]*?${REACT_DOCTOR_BLOCK_END}\\n?|${LEGACY_MANAGED_BLOCK_START}[\\s\\S]*?${LEGACY_MANAGED_BLOCK_END}\\n?)`,
);
const SHEBANG = "#!/bin/sh";
const SHEBANG_PREFIX = "#!";
const LOCAL_REACT_DOCTOR_BIN = "./node_modules/.bin/react-doctor";

const runGit = (projectRoot: string, args: ReadonlyArray<string>): string | null => {
  try {
    return execFileSync("git", [...args], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

const resolveGitPath = (baseDirectory: string, value: string): string =>
  path.isAbsolute(value) ? value : path.resolve(baseDirectory, value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getPackageJsonPath = (projectRoot: string): string =>
  path.join(projectRoot, PACKAGE_JSON_FILE_NAME);

const readPackageJson = (projectRoot: string): unknown => {
  try {
    return JSON.parse(readFileSync(getPackageJsonPath(projectRoot), "utf8"));
  } catch {
    return null;
  }
};

const writeJsonFile = (filePath: string, value: unknown): void => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const packageHasDependency = (projectRoot: string, dependencyName: string): boolean => {
  const packageJson = readPackageJson(projectRoot);
  if (!isRecord(packageJson)) return false;
  return ["dependencies", "devDependencies", "optionalDependencies"].some((fieldName) => {
    const dependencies = packageJson[fieldName];
    return isRecord(dependencies) && typeof dependencies[dependencyName] === "string";
  });
};

const packageHasRecordKey = (projectRoot: string, key: string): boolean => {
  const packageJson = readPackageJson(projectRoot);
  return isRecord(packageJson) && isRecord(packageJson[key]);
};

const packageHasNestedRecordKey = (
  projectRoot: string,
  key: string,
  nestedKey: string,
): boolean => {
  const packageJson = readPackageJson(projectRoot);
  if (!isRecord(packageJson)) return false;
  const value = packageJson[key];
  return isRecord(value) && isRecord(value[nestedKey]);
};

const packageHasKey = (projectRoot: string, key: string): boolean => {
  const packageJson = readPackageJson(projectRoot);
  return isRecord(packageJson) && packageJson[key] !== undefined;
};

const isHuskyProject = (projectRoot: string): boolean =>
  existsSync(path.join(projectRoot, HUSKY_HOOKS_PATH)) ||
  packageHasDependency(projectRoot, "husky");

const isVitePlusProject = (projectRoot: string): boolean =>
  packageHasDependency(projectRoot, "vite-plus");

const isSimpleGitHooksProject = (projectRoot: string): boolean => {
  const packageJson = readPackageJson(projectRoot);
  return (
    (isRecord(packageJson) && isRecord(packageJson[SIMPLE_GIT_HOOKS_PACKAGE_JSON_KEY])) ||
    packageHasDependency(projectRoot, SIMPLE_GIT_HOOKS_PACKAGE_JSON_KEY) ||
    existsSync(path.join(projectRoot, SIMPLE_GIT_HOOKS_CONFIG_FILE))
  );
};

const getLefthookConfigPath = (projectRoot: string): string | null => {
  for (const fileName of LEFTHOOK_CONFIG_FILES) {
    const filePath = path.join(projectRoot, fileName);
    if (existsSync(filePath)) return filePath;
  }
  return packageHasDependency(projectRoot, "lefthook")
    ? path.join(projectRoot, LEFTHOOK_CONFIG_FILES[0] ?? "lefthook.yml")
    : null;
};

const isPreCommitProject = (projectRoot: string): boolean =>
  existsSync(path.join(projectRoot, PRE_COMMIT_CONFIG_FILE));

const isOvercommitProject = (projectRoot: string): boolean =>
  existsSync(path.join(projectRoot, OVERCOMMIT_CONFIG_FILE)) ||
  packageHasDependency(projectRoot, "overcommit");

const isYorkieProject = (projectRoot: string): boolean =>
  packageHasRecordKey(projectRoot, "gitHooks") || packageHasDependency(projectRoot, "yorkie");

const isGhooksProject = (projectRoot: string): boolean =>
  packageHasDependency(projectRoot, "ghooks") ||
  packageHasRecordKey(projectRoot, "ghooks") ||
  packageHasNestedRecordKey(projectRoot, "config", "ghooks");

const isGitHooksJsProject = (projectRoot: string): boolean =>
  packageHasRecordKey(projectRoot, "git-hooks") ||
  packageHasDependency(projectRoot, "git-hooks-js");

const isPreCommitNpmProject = (projectRoot: string): boolean =>
  packageHasDependency(projectRoot, "pre-commit") || packageHasKey(projectRoot, "pre-commit");

const isLintStagedProject = (projectRoot: string): boolean =>
  packageHasKey(projectRoot, "lint-staged") || packageHasDependency(projectRoot, "lint-staged");

const isNanoStagedProject = (projectRoot: string): boolean =>
  packageHasKey(projectRoot, "nano-staged") || packageHasDependency(projectRoot, "nano-staged");

const isPrettyQuickProject = (projectRoot: string): boolean =>
  packageHasDependency(projectRoot, "pretty-quick");

export const detectGitHookTarget = (projectRoot: string): GitHookTarget | null => {
  if (runGit(projectRoot, ["rev-parse", "--is-inside-work-tree"]) !== "true") return null;

  const topLevel = runGit(projectRoot, ["rev-parse", "--show-toplevel"]) ?? projectRoot;
  const configuredHooksPath = runGit(projectRoot, ["config", "--path", "--get", "core.hooksPath"]);

  if (configuredHooksPath !== null && configuredHooksPath.length > 0) {
    return {
      hookPath: path.join(resolveGitPath(topLevel, configuredHooksPath), HOOK_FILE_NAME),
      runnerRoot: topLevel,
      kind: "configured",
    };
  }

  if (isHuskyProject(topLevel)) {
    return {
      hookPath: path.join(topLevel, HUSKY_HOOKS_PATH, HOOK_FILE_NAME),
      runnerRoot: topLevel,
      kind: "husky",
      hooksPathConfig: HUSKY_HOOKS_PATH,
    };
  }

  if (isVitePlusProject(topLevel)) {
    return {
      hookPath: path.join(topLevel, VITE_PLUS_HOOKS_PATH, HOOK_FILE_NAME),
      runnerRoot: topLevel,
      kind: "vite-plus",
      hooksPathConfig: VITE_PLUS_HOOKS_PATH,
    };
  }

  if (isSimpleGitHooksProject(topLevel)) {
    return {
      hookPath: path.join(topLevel, "package.json"),
      runnerRoot: topLevel,
      kind: "simple-git-hooks",
    };
  }

  const lefthookConfigPath = getLefthookConfigPath(topLevel);
  if (lefthookConfigPath !== null) {
    return {
      hookPath: lefthookConfigPath,
      runnerRoot: topLevel,
      kind: "lefthook",
    };
  }

  if (isPreCommitProject(topLevel)) {
    return {
      hookPath: path.join(topLevel, PRE_COMMIT_CONFIG_FILE),
      runnerRoot: topLevel,
      kind: "pre-commit",
    };
  }

  if (isOvercommitProject(topLevel)) {
    return {
      hookPath: path.join(topLevel, OVERCOMMIT_CONFIG_FILE),
      runnerRoot: topLevel,
      kind: "overcommit",
    };
  }

  if (isYorkieProject(topLevel)) {
    return {
      hookPath: getPackageJsonPath(topLevel),
      runnerRoot: topLevel,
      kind: "yorkie",
    };
  }

  if (isGhooksProject(topLevel)) {
    return {
      hookPath: getPackageJsonPath(topLevel),
      runnerRoot: topLevel,
      kind: "ghooks",
    };
  }

  if (isGitHooksJsProject(topLevel)) {
    return {
      hookPath: getPackageJsonPath(topLevel),
      runnerRoot: topLevel,
      kind: "git-hooks-js",
    };
  }

  if (isPreCommitNpmProject(topLevel)) {
    return {
      hookPath: getPackageJsonPath(topLevel),
      runnerRoot: topLevel,
      kind: "pre-commit-npm",
    };
  }

  if (isLintStagedProject(topLevel)) {
    return {
      hookPath: getPackageJsonPath(topLevel),
      runnerRoot: topLevel,
      kind: "lint-staged",
    };
  }

  if (isNanoStagedProject(topLevel)) {
    return {
      hookPath: getPackageJsonPath(topLevel),
      runnerRoot: topLevel,
      kind: "nano-staged",
    };
  }

  if (isPrettyQuickProject(topLevel)) {
    return {
      hookPath: getPackageJsonPath(topLevel),
      runnerRoot: topLevel,
      kind: "pretty-quick",
    };
  }

  const hookPath = runGit(projectRoot, ["rev-parse", "--git-path", HOOK_RELATIVE_PATH]);
  if (hookPath === null || hookPath.length === 0) return null;

  return {
    hookPath: resolveGitPath(projectRoot, hookPath),
    runnerRoot: topLevel,
    kind: "git",
  };
};

const buildReactDoctorHookBlock = (): string =>
  [
    REACT_DOCTOR_BLOCK_START,
    "react_doctor_scan_staged_files() {",
    `  if [ -x "${LOCAL_REACT_DOCTOR_BIN}" ]; then`,
    `    "${LOCAL_REACT_DOCTOR_BIN}" ${REACT_DOCTOR_COMMAND.replace("react-doctor ", "")}`,
    "    return",
    "  fi",
    "",
    "  if command -v react-doctor >/dev/null 2>&1; then",
    `    ${REACT_DOCTOR_COMMAND}`,
    "    return",
    "  fi",
    "",
    "  if command -v pnpm >/dev/null 2>&1; then",
    "    pnpm dlx react-doctor@latest --staged --fail-on none",
    "    return",
    "  fi",
    "",
    "  if command -v npx >/dev/null 2>&1; then",
    "    npx --yes react-doctor@latest --staged --fail-on none",
    "    return",
    "  fi",
    "",
    "  printf '%s\\n' \"react-doctor: command not found; skipping staged scan.\"",
    "}",
    "",
    "printf '%s\\n' \"react-doctor: scanning staged files (non-blocking).\"",
    "if ! react_doctor_scan_staged_files; then",
    "  printf '%s\\n' \"react-doctor: staged scan failed; commit will continue.\"",
    "fi",
    REACT_DOCTOR_BLOCK_END,
  ].join("\n");

const ensureTrailingNewline = (content: string): string =>
  content.endsWith("\n") ? content : `${content}\n`;

const mergeHookContent = (existingContent: string): string => {
  const hookBlock = `${buildReactDoctorHookBlock()}\n`;

  if (REACT_DOCTOR_BLOCK_PATTERN.test(existingContent)) {
    return ensureTrailingNewline(existingContent.replace(REACT_DOCTOR_BLOCK_PATTERN, hookBlock));
  }

  if (existingContent.length === 0) return `${SHEBANG}\n\n${hookBlock}`;

  const normalizedExistingContent = ensureTrailingNewline(existingContent);

  if (normalizedExistingContent.startsWith(SHEBANG_PREFIX)) {
    const [shebangLine, ...remainingLines] = normalizedExistingContent.split("\n");
    return [shebangLine, "", hookBlock.trimEnd(), ...remainingLines].join("\n");
  }

  return `${SHEBANG}\n\n${hookBlock}${normalizedExistingContent}`;
};

const removeLegacyManagedRunner = (projectRoot: string): void => {
  const runnerPath = path.join(projectRoot, LEGACY_HOOK_RUNNER_RELATIVE_PATH);
  rmSync(runnerPath, { force: true });
  for (const directory of [path.dirname(runnerPath), path.join(projectRoot, ".react-doctor")]) {
    try {
      rmdirSync(directory);
    } catch {}
  }
};

const installSimpleGitHooks = (options: InstallGitHookOptions): InstallGitHookResult => {
  const packageJsonPath = getPackageJsonPath(options.projectRoot);
  const didHookExist = existsSync(packageJsonPath);
  const packageJson = readPackageJson(options.projectRoot);
  const nextPackageJson = isRecord(packageJson) ? { ...packageJson } : {};
  const existingConfig = nextPackageJson[SIMPLE_GIT_HOOKS_PACKAGE_JSON_KEY];
  const nextConfig = isRecord(existingConfig) ? { ...existingConfig } : {};
  const existingPreCommit =
    typeof nextConfig["pre-commit"] === "string" ? nextConfig["pre-commit"] : "";
  const nextPreCommit = existingPreCommit.includes(REACT_DOCTOR_COMMAND)
    ? existingPreCommit
    : [existingPreCommit, NON_BLOCKING_REACT_DOCTOR_COMMAND].filter(Boolean).join("\n");
  nextConfig["pre-commit"] = nextPreCommit;
  nextPackageJson[SIMPLE_GIT_HOOKS_PACKAGE_JSON_KEY] = nextConfig;
  writeJsonFile(packageJsonPath, nextPackageJson);
  removeLegacyManagedRunner(options.projectRoot);

  return {
    hookPath: packageJsonPath,
    kind: "simple-git-hooks",
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

const installPackageJsonPreCommitString = (
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

const installGhooks = (options: InstallGitHookOptions): InstallGitHookResult => {
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
    kind: "ghooks",
    status: didHookExist ? "updated" : "created",
  };
};

const installPreCommitNpm = (options: InstallGitHookOptions): InstallGitHookResult => {
  const packageJsonPath = getPackageJsonPath(options.projectRoot);
  const didHookExist = existsSync(packageJsonPath);
  const packageJson = readPackageJson(options.projectRoot);
  const nextPackageJson = isRecord(packageJson) ? { ...packageJson } : {};
  nextPackageJson["pre-commit"] = appendArrayCommand(nextPackageJson["pre-commit"]);
  writeJsonFile(packageJsonPath, nextPackageJson);
  removeLegacyManagedRunner(options.projectRoot);
  return {
    hookPath: packageJsonPath,
    kind: "pre-commit-npm",
    status: didHookExist ? "updated" : "created",
  };
};

const installStagedConfig = (
  options: InstallGitHookOptions,
  kind: "lint-staged" | "nano-staged",
): InstallGitHookResult => {
  const packageJsonPath = getPackageJsonPath(options.projectRoot);
  const didHookExist = existsSync(packageJsonPath);
  const packageJson = readPackageJson(options.projectRoot);
  const nextPackageJson = isRecord(packageJson) ? { ...packageJson } : {};
  const existingConfig = nextPackageJson[kind];
  const nextConfig = isRecord(existingConfig) ? { ...existingConfig } : {};
  nextConfig["*"] = appendArrayCommand(nextConfig["*"]);
  nextPackageJson[kind] = nextConfig;
  writeJsonFile(packageJsonPath, nextPackageJson);
  removeLegacyManagedRunner(options.projectRoot);
  return {
    hookPath: packageJsonPath,
    kind,
    status: didHookExist ? "updated" : "created",
  };
};

const installPrettyQuick = (options: InstallGitHookOptions): InstallGitHookResult =>
  installPackageJsonPreCommitString(options, "pretty-quick", "gitHooks");

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

const installLefthook = (options: InstallGitHookOptions): InstallGitHookResult => {
  const didHookExist = existsSync(options.hookPath);
  const existingContent = didHookExist ? readFileSync(options.hookPath, "utf8") : "";
  if (!existingContent.includes("react-doctor")) {
    const nextContent = appendIndentedBlockToTopLevelSection(existingContent, "pre-commit", [
      "  commands:",
      "    react-doctor:",
      `      run: ${NON_BLOCKING_REACT_DOCTOR_COMMAND}`,
      "",
    ]);
    mkdirSync(path.dirname(options.hookPath), { recursive: true });
    writeFileSync(options.hookPath, nextContent);
  }
  removeLegacyManagedRunner(options.projectRoot);

  return {
    hookPath: options.hookPath,
    kind: "lefthook",
    status: didHookExist ? "updated" : "created",
  };
};

const installPreCommit = (options: InstallGitHookOptions): InstallGitHookResult => {
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
    kind: "pre-commit",
    status: didHookExist ? "updated" : "created",
  };
};

const installOvercommit = (options: InstallGitHookOptions): InstallGitHookResult => {
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
    kind: "overcommit",
    status: didHookExist ? "updated" : "created",
  };
};

export const installReactDoctorGitHook = (options: InstallGitHookOptions): InstallGitHookResult => {
  if (options.kind === "simple-git-hooks") return installSimpleGitHooks(options);
  if (options.kind === "lefthook") return installLefthook(options);
  if (options.kind === "pre-commit") return installPreCommit(options);
  if (options.kind === "overcommit") return installOvercommit(options);
  if (options.kind === "yorkie")
    return installPackageJsonPreCommitString(options, "yorkie", "gitHooks");
  if (options.kind === "ghooks") return installGhooks(options);
  if (options.kind === "git-hooks-js")
    return installPackageJsonPreCommitString(options, "git-hooks-js", "git-hooks");
  if (options.kind === "pre-commit-npm") return installPreCommitNpm(options);
  if (options.kind === "lint-staged") return installStagedConfig(options, "lint-staged");
  if (options.kind === "nano-staged") return installStagedConfig(options, "nano-staged");
  if (options.kind === "pretty-quick") return installPrettyQuick(options);

  const didHookExist = existsSync(options.hookPath);
  const existingContent = didHookExist ? readFileSync(options.hookPath, "utf8") : "";
  const nextContent = mergeHookContent(existingContent);

  if (options.hooksPathConfig !== undefined) {
    runGit(options.projectRoot, ["config", "core.hooksPath", options.hooksPathConfig]);
  }

  mkdirSync(path.dirname(options.hookPath), { recursive: true });
  writeFileSync(options.hookPath, nextContent);
  chmodSync(options.hookPath, GIT_HOOK_EXECUTABLE_MODE);
  removeLegacyManagedRunner(options.projectRoot);

  return {
    hookPath: options.hookPath,
    kind: options.kind ?? "git",
    status: didHookExist ? "updated" : "created",
  };
};
