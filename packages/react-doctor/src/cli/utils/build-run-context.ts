import { isCiEnvironment, isCodingAgentEnvironment } from "./is-ci-environment.js";
import { isNonInteractiveEnvironment } from "./is-non-interactive-environment.js";
import { isJsonModeActive } from "./json-mode.js";
import { VERSION } from "./version.js";

export interface RunContext {
  version: string;
  origin: string;
  command: string;
  argv: string;
  cwd: string;
  node: string;
  platform: string;
  arch: string;
  ci: boolean;
  ciProvider: string | null;
  codingAgent: string | null;
  interactive: boolean;
  jsonMode: boolean;
}

// Maps a CI provider's signature env var to a stable label. Order only
// matters when a runner sets several at once (first match wins).
const CI_PROVIDER_BY_ENVIRONMENT_VARIABLE: ReadonlyArray<readonly [string, string]> = [
  ["GITHUB_ACTIONS", "github-actions"],
  ["GITLAB_CI", "gitlab-ci"],
  ["CIRCLECI", "circleci"],
  ["BUILDKITE", "buildkite"],
  ["JENKINS_URL", "jenkins"],
  ["TF_BUILD", "azure-pipelines"],
  ["CODEBUILD_BUILD_ID", "aws-codebuild"],
  ["TEAMCITY_VERSION", "teamcity"],
  ["BITBUCKET_BUILD_NUMBER", "bitbucket"],
  ["TRAVIS", "travis"],
  ["DRONE", "drone"],
];

// Maps a coding agent's runtime marker env var to a stable label (mirrors
// the boolean sets in is-ci-environment.ts, adding the brand identity).
const CODING_AGENT_BY_ENVIRONMENT_VARIABLE: ReadonlyArray<readonly [string, string]> = [
  ["CLAUDECODE", "claude-code"],
  ["CLAUDE_CODE", "claude-code"],
  ["CURSOR_AGENT", "cursor"],
  ["CODEX_CI", "codex"],
  ["CODEX_SANDBOX", "codex"],
  ["CODEX_SANDBOX_NETWORK_DISABLED", "codex"],
  ["OPENCODE", "opencode"],
  ["GOOSE_TERMINAL", "goose"],
  ["AMP_THREAD_ID", "amp"],
];

const ROOT_SUBCOMMANDS = new Set(["install", "setup"]);

const detectOrigin = (): string => {
  // `GIT_DIR` is git's canonical "I'm inside a hook" signal (git-hooks(5)).
  if (process.env.GIT_DIR) return "git-hook";
  if (isCodingAgentEnvironment()) return "agent";
  if (isCiEnvironment()) return "ci";
  return "cli";
};

const detectCommand = (userArguments: ReadonlyArray<string>): string => {
  for (const argument of userArguments) {
    if (argument === "--") break;
    if (argument.startsWith("-")) continue;
    return ROOT_SUBCOMMANDS.has(argument) ? argument : "inspect";
  }
  return "inspect";
};

const detectCiProvider = (): string | null => {
  for (const [environmentVariable, provider] of CI_PROVIDER_BY_ENVIRONMENT_VARIABLE) {
    if (process.env[environmentVariable]) return provider;
  }
  return process.env.CI === "true" ? "unknown" : null;
};

const detectCodingAgent = (): string | null => {
  for (const [environmentVariable, agent] of CODING_AGENT_BY_ENVIRONMENT_VARIABLE) {
    if (process.env[environmentVariable]) return agent;
  }
  const agentValue = process.env.AGENT?.toLowerCase();
  if (agentValue === "amp" || agentValue === "goose") return agentValue;
  if (process.env.AGENT_SESSION_ID || process.env.AGENT_THREAD_ID) return "unknown";
  return null;
};

/**
 * Snapshot of the current invocation, attached to Sentry events as the
 * `run` context to make crashes triage-able (which version, platform,
 * CI/agent, how it was invoked). Every field is cheap, synchronous, and
 * safe to read at any point — cwd reads fall back, env reads are
 * booleans — so it's rebuilt lazily at capture time when runtime-only
 * signals like `jsonMode` are finally known.
 */
export const buildRunContext = (): RunContext => {
  const userArguments = process.argv.slice(2);
  return {
    version: VERSION,
    origin: detectOrigin(),
    command: detectCommand(userArguments),
    argv: userArguments.join(" "),
    cwd: process.cwd(),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    ci: isCiEnvironment(),
    ciProvider: detectCiProvider(),
    codingAgent: detectCodingAgent(),
    interactive: !isNonInteractiveEnvironment(),
    jsonMode: isJsonModeActive(),
  };
};
