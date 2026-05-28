import * as Effect from "effect/Effect";
import { highlighter } from "@react-doctor/core";
import type { Diagnostic } from "@react-doctor/core";
import { cliLogger as logger } from "./cli-logger.js";
import { TRIAGE_API_KEY_ENV_VARIABLE, TRIAGE_OAUTH_TOKEN_ENV_VARIABLE } from "./constants.js";
import { hasLocalClaudeCodeAuth } from "./detect-claude-code-auth.js";
import { printTriageOutcome } from "./render-triage.js";
import { spinner } from "./spinner.js";
import { triageDiagnostics, type TriageProgressEvent } from "./triage.js";

export interface RunTriageInput {
  readonly diagnostics: ReadonlyArray<Diagnostic>;
  readonly rootDirectory: string;
  readonly verbose: boolean;
}

const MISSING_AUTH_WARNING_LINES: ReadonlyArray<string> = [
  "--triage skipped: no Claude credentials found.",
  "  Pick one of these to enable triage:",
  "    • Use your Claude subscription: run `claude setup-token` (or `claude /login`) — recommended if you already pay for Pro/Max",
  `    • Use an API key: set ${TRIAGE_API_KEY_ENV_VARIABLE} from https://console.anthropic.com/`,
];

const resolveAuthDisplayLabel = (): string | null => {
  if (process.env[TRIAGE_OAUTH_TOKEN_ENV_VARIABLE]) return "Claude subscription";
  if (process.env[TRIAGE_API_KEY_ENV_VARIABLE]) return "Anthropic API key";
  if (hasLocalClaudeCodeAuth()) return "Claude Code login";
  return null;
};

const buildSpinnerLabel = (diagnosticCount: number, authLabel: string): string =>
  `Triaging ${diagnosticCount} ${diagnosticCount === 1 ? "diagnostic" : "diagnostics"} with Claude (${authLabel})…`;

const buildSpinnerUpdate = (event: TriageProgressEvent, baseLabel: string): string => {
  if (event.kind === "tool") return `${baseLabel} ${event.summary}`;
  if (event.kind === "thinking") return `${baseLabel} thinking`;
  return baseLabel;
};

const formatTriageError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export const runTriage = async (input: RunTriageInput): Promise<void> => {
  if (input.diagnostics.length === 0) {
    logger.dim("  No diagnostics to triage — skipping --triage.");
    logger.break();
    return;
  }

  const authLabel = resolveAuthDisplayLabel();
  if (!authLabel) {
    for (const line of MISSING_AUTH_WARNING_LINES) logger.warn(line);
    logger.break();
    return;
  }

  const baseLabel = buildSpinnerLabel(input.diagnostics.length, authLabel);
  const triageSpinner = spinner(baseLabel).start();

  try {
    const outcome = await triageDiagnostics({
      diagnostics: input.diagnostics,
      workingDirectory: input.rootDirectory,
      onProgress: (event) => triageSpinner.update(buildSpinnerUpdate(event, baseLabel)),
    });
    triageSpinner.succeed(
      `${baseLabel.replace(/…$/, "")} ${highlighter.success(`→ ${String(outcome.kept.length)} kept · ${String(outcome.suppressed.length)} suppressed`)}`,
    );
    await Effect.runPromise(
      printTriageOutcome({
        outcome,
        rootDirectory: input.rootDirectory,
        verbose: input.verbose,
      }),
    );
  } catch (error) {
    triageSpinner.fail(`Triage failed: ${formatTriageError(error)}`);
    logger.break();
    logger.dim(
      "  The base diagnostics above are unchanged — fall back to them, or rerun with --triage once the issue clears.",
    );
    logger.break();
  }
};
