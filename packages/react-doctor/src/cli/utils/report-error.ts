import * as Sentry from "@sentry/node";
import { buildRunContext } from "./build-run-context.js";

/**
 * Sends an error to Sentry, enriched with a snapshot of the current run
 * (version, platform, CI/agent, invocation), and waits for delivery
 * before the caller exits. The CLI tears down the process synchronously
 * after rendering an error, so the awaited `flush` is what actually gets
 * the event off the machine (see the Sentry CLI/serverless flush
 * contract).
 *
 * Returns early when Sentry was never initialized (`--no-score`, tests,
 * or a missing DSN), and swallows any transport failure so telemetry can
 * never mask the user's original error.
 */
export const reportErrorToSentry = async (error: unknown): Promise<void> => {
  if (!Sentry.isInitialized()) return;
  try {
    const runContext = buildRunContext();
    Sentry.setContext("run", { ...runContext });
    Sentry.setTags({
      origin: runContext.origin,
      command: runContext.command,
      ciProvider: runContext.ciProvider,
      codingAgent: runContext.codingAgent,
    });
    Sentry.captureException(error);
    // Wait up to 2s for delivery before the CLI exits.
    await Sentry.flush(2000);
  } catch {}
};
