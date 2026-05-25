// Narrow on canonical CI signals only. Used to suppress the share
// URL (noise in CI logs) and to mark the run as CI-originated for
// the score path. Does not imply `--no-score`.
const CI_ENVIRONMENT_VARIABLES = ["GITHUB_ACTIONS", "GITLAB_CI", "CIRCLECI"];

const CODING_AGENT_ENVIRONMENT_VARIABLES = [
  "CLAUDECODE",
  "CLAUDE_CODE",
  "CURSOR_AGENT",
  "CODEX_CI",
  "CODEX_SANDBOX",
  "CODEX_SANDBOX_NETWORK_DISABLED",
  "OPENCODE",
  "GOOSE_TERMINAL",
  "AGENT_SESSION_ID",
  "AMP_THREAD_ID",
  "AGENT_THREAD_ID",
] as const;

const CODING_AGENT_ENVIRONMENT_VALUES = {
  AGENT: ["amp", "goose"],
} as const;

export const isCiEnvironment = (): boolean =>
  CI_ENVIRONMENT_VARIABLES.some((envVariable) => Boolean(process.env[envVariable])) ||
  process.env.CI === "true";

export const isCodingAgentEnvironment = (): boolean =>
  CODING_AGENT_ENVIRONMENT_VARIABLES.some((envVariable) => Boolean(process.env[envVariable])) ||
  Object.entries(CODING_AGENT_ENVIRONMENT_VALUES).some(([envVariable, values]) =>
    values.some((value) => process.env[envVariable] === value),
  );

export const isCiOrCodingAgentEnvironment = (): boolean =>
  isCiEnvironment() || isCodingAgentEnvironment();
