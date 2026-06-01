import {
  detectCiProvider,
  detectCodingAgent,
  isCiEnvironment,
  isCodingAgentEnvironment,
} from "./is-ci-environment.js";
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
