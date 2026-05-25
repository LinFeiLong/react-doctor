import { isCiEnvironment } from "./is-ci-environment.js";

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

export const isCodingAgentEnvironment = (): boolean =>
  CODING_AGENT_ENVIRONMENT_VARIABLES.some((envVariable) => Boolean(process.env[envVariable])) ||
  Object.entries(CODING_AGENT_ENVIRONMENT_VALUES).some(([envVariable, values]) =>
    values.some((value) => process.env[envVariable] === value),
  );

export const isCiOrCodingAgentEnvironment = (): boolean =>
  isCiEnvironment() || isCodingAgentEnvironment();
