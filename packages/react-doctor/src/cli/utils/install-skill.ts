import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getSkillAgentConfig,
  installSkillsFromSource,
  SKILL_MANIFEST_FILE,
  type SkillAgentType,
} from "agent-install";
import { highlighter, SKILL_NAME } from "@react-doctor/core";
import { cliLogger as logger } from "./cli-logger.js";
import { detectAvailableAgents } from "./detect-agents.js";
import { installReactDoctorAgentHooks } from "./install-agent-hooks.js";
import { GitHookKind, type GitHookTarget } from "./git-hook-types.js";
import { detectGitHookTarget, installReactDoctorGitHook } from "./install-git-hook.js";
import { prompts } from "./prompts.js";
import { shouldSkipPrompts } from "./should-skip-prompts.js";
import { spinner } from "./spinner.js";

const NATIVE_AGENT_HOOK_AGENTS = new Set<SkillAgentType>(["claude-code", "cursor"]);
const CONFIG_ONLY_GIT_HOOK_KINDS = new Set([
  GitHookKind.Ghooks,
  GitHookKind.GitHooksJs,
  GitHookKind.Lefthook,
  GitHookKind.Overcommit,
  GitHookKind.PreCommit,
  GitHookKind.PreCommitNpm,
  GitHookKind.PrettyQuick,
  GitHookKind.SimpleGitHooks,
  GitHookKind.Yorkie,
]);

const buildManualGitHookTarget = (hookPath: string, projectRoot: string): GitHookTarget => ({
  hookPath,
  runnerRoot: projectRoot,
  kind: GitHookKind.Git,
});

const hasNativeAgentHookTarget = (agents: readonly SkillAgentType[]): boolean =>
  agents.some((agent) => NATIVE_AGENT_HOOK_AGENTS.has(agent));

const formatGitHookInstallMessage = (
  hookResult: ReturnType<typeof installReactDoctorGitHook>,
): string => {
  if (CONFIG_ONLY_GIT_HOOK_KINDS.has(hookResult.kind)) {
    return `React Doctor pre-commit config ${hookResult.status} at ${hookResult.hookPath}. Run your hook manager's install command if hooks are not already installed.`;
  }
  return `React Doctor pre-commit hook ${hookResult.status} at ${hookResult.hookPath}.`;
};

interface InstallSkillOptions {
  yes?: boolean;
  dryRun?: boolean;
  agentHooks?: boolean;
  // Overrides for tests; production callers leave these unset.
  sourceDir?: string;
  projectRoot?: string;
  detectedAgents?: SkillAgentType[];
  gitHookPath?: string | null;
}

const getSkillSourceDirectory = (): string => {
  const distDirectory = path.dirname(fileURLToPath(import.meta.url));
  return path.join(distDirectory, "skills", SKILL_NAME);
};

export const runInstallSkill = async (options: InstallSkillOptions = {}): Promise<void> => {
  const projectRoot = options.projectRoot ?? process.cwd();
  const sourceDir = options.sourceDir ?? getSkillSourceDirectory();

  if (!existsSync(path.join(sourceDir, SKILL_MANIFEST_FILE))) {
    logger.error(`Could not locate the ${SKILL_NAME} skill bundled with this package.`);
    process.exitCode = 1;
    return;
  }

  const detectedAgents = options.detectedAgents ?? (await detectAvailableAgents());
  if (detectedAgents.length === 0) {
    logger.error("No supported coding agents detected.");
    logger.dim(
      "  Looked for binaries on PATH (claude, codex, cursor, droid, gemini, copilot, opencode, pi)",
    );
    logger.dim("  and config dirs in $HOME (~/.claude, ~/.cursor, ~/.codex, ~/.gemini, ...).");
    process.exitCode = 1;
    return;
  }

  const skipPrompts = shouldSkipPrompts({ yes: options.yes });
  const gitHookTarget =
    options.gitHookPath === undefined
      ? detectGitHookTarget(projectRoot)
      : options.gitHookPath === null
        ? null
        : buildManualGitHookTarget(options.gitHookPath, projectRoot);
  const gitHookPath = gitHookTarget?.hookPath;

  const selectedAgents: SkillAgentType[] = skipPrompts
    ? detectedAgents
    : ((
        await prompts({
          type: "multiselect",
          name: "agents",
          message: `Install the ${highlighter.info(SKILL_NAME)} skill for:`,
          choices: detectedAgents.map((agent) => ({
            title: getSkillAgentConfig(agent).displayName,
            value: agent,
            selected: true,
          })),
          instructions: false,
          min: 1,
        })
      ).agents ?? []);

  if (selectedAgents.length === 0) return;

  const shouldInstallGitHook =
    gitHookPath !== null &&
    gitHookPath !== undefined &&
    (Boolean(options.yes) ||
      (!skipPrompts &&
        Boolean(
          (
            await prompts<"installGitHook">({
              type: "confirm",
              name: "installGitHook",
              message: "Run React Doctor on staged files before commits? (non-blocking git hook)",
              initial: true,
            })
          ).installGitHook,
        )));

  const shouldInstallAgentHooks =
    Boolean(options.agentHooks) ||
    (!skipPrompts &&
      hasNativeAgentHookTarget(selectedAgents) &&
      Boolean(
        (
          await prompts<"installAgentHooks">({
            type: "confirm",
            name: "installAgentHooks",
            message: "Install native agent hooks after file edits? (Claude Code / Cursor)",
            initial: false,
          })
        ).installAgentHooks,
      ));

  if (options.dryRun) {
    logger.log(`Dry run — would install ${SKILL_NAME} skill for:`);
    for (const agent of selectedAgents) {
      logger.dim(`  - ${getSkillAgentConfig(agent).displayName}`);
    }
    logger.dim(`  Source: ${sourceDir}`);
    if (shouldInstallGitHook) {
      logger.dim(`  Git hook: ${gitHookPath}`);
    }
    if (shouldInstallAgentHooks) {
      logger.dim("  Agent hooks: Claude Code / Cursor when selected");
    }
    return;
  }

  const installSpinner = spinner(`Installing ${SKILL_NAME} skill...`).start();
  try {
    const installResult = await installSkillsFromSource({
      source: sourceDir,
      agents: selectedAgents,
      cwd: projectRoot,
      mode: "copy",
    });

    if (installResult.skills.length === 0) {
      throw new Error(
        `Could not parse ${SKILL_MANIFEST_FILE} for ${SKILL_NAME} (missing or invalid frontmatter).`,
      );
    }
    if (installResult.failed.length > 0) {
      throw new Error(
        installResult.failed
          .map((failure) => `${getSkillAgentConfig(failure.agent).displayName}: ${failure.error}`)
          .join("\n"),
      );
    }

    installSpinner.succeed(
      `${SKILL_NAME} skill installed for ${selectedAgents.map((agent) => getSkillAgentConfig(agent).displayName).join(", ")}.`,
    );
  } catch (error) {
    installSpinner.fail(`Failed to install ${SKILL_NAME} skill.`);
    throw error;
  }

  if (shouldInstallGitHook && gitHookTarget !== null && gitHookTarget !== undefined) {
    const hookSpinner = spinner("Installing React Doctor pre-commit hook...").start();
    try {
      const hookResult = installReactDoctorGitHook({
        hookPath: gitHookTarget.hookPath,
        projectRoot: gitHookTarget.runnerRoot,
        kind: gitHookTarget.kind,
        hooksPathConfig: gitHookTarget.hooksPathConfig,
      });
      hookSpinner.succeed(formatGitHookInstallMessage(hookResult));
    } catch (error) {
      hookSpinner.fail("Failed to install React Doctor pre-commit hook.");
      throw error;
    }
  }

  if (shouldInstallAgentHooks) {
    const hookSpinner = spinner("Installing React Doctor agent hooks...").start();
    try {
      const hookResult = installReactDoctorAgentHooks({
        projectRoot,
        agents: selectedAgents,
      });
      if (hookResult.installedAgents.length === 0) {
        hookSpinner.succeed("No supported native agent hook targets selected.");
      } else {
        hookSpinner.succeed(
          `React Doctor agent hooks installed for ${hookResult.installedAgents.map((agent) => getSkillAgentConfig(agent).displayName).join(", ")}.`,
        );
      }
    } catch (error) {
      hookSpinner.fail("Failed to install React Doctor agent hooks.");
      throw error;
    }
  }
};
