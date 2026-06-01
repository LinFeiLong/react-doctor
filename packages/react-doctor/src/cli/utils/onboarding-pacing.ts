import * as Effect from "effect/Effect";
import { isCiOrCodingAgentEnvironment } from "./is-ci-environment.js";
import { isSpinnerInteractive } from "./is-spinner-interactive.js";

// Each scan-report section waits this long before printing, so a first human
// run reads as a guided reveal rather than one painted frame.
export const ONBOARDING_SECTION_DELAY_MS = 850;

// After the score lands, the report quickens by 1.25x.
export const ONBOARDING_SECTION_DELAY_FAST_MS = Math.round(ONBOARDING_SECTION_DELAY_MS / 1.25);

// Internal escape hatch: force the first-run onboarding on any run, bypassing
// the onboarded marker, the TTY check, and CI/agent detection. For demos.
export const FORCE_ONBOARDING_ENV_VAR = "REACT_DOCTOR_FORCE_ONBOARDING";

const FALSY_FLAG_VALUES = new Set(["", "0", "false"]);

export const isOnboardingForced = (environment: NodeJS.ProcessEnv = process.env): boolean => {
  const value = environment[FORCE_ONBOARDING_ENV_VAR];
  return value !== undefined && !FALSY_FLAG_VALUES.has(value.toLowerCase());
};

export interface OnboardingPacingInput {
  // Defaults to the live stdout TTY probe; injectable for tests.
  readonly isInteractive?: boolean;
  // Defaults to the live CI/coding-agent env probe; injectable for tests.
  readonly isCiOrCodingAgent?: boolean;
}

// Pace only on an interactive TTY that isn't CI or a coding agent, so automated
// callers stay instant and their captured output is unchanged.
export const shouldPaceOnboardingSections = (input: OnboardingPacingInput = {}): boolean => {
  if (isOnboardingForced()) return true;
  const isInteractive = input.isInteractive ?? process.stdout.isTTY === true;
  const isCiOrCodingAgent = input.isCiOrCodingAgent ?? isCiOrCodingAgentEnvironment();
  return isInteractive && !isCiOrCodingAgent;
};

// The beat to `yield*` before a section: a sleep when pacing, else a no-op.
// `delayMs` picks the pre-score (default) or faster post-score cadence.
export const onboardingSectionPause = (
  shouldPace: boolean,
  delayMs: number = ONBOARDING_SECTION_DELAY_MS,
): Effect.Effect<void> => (shouldPace ? Effect.sleep(delayMs) : Effect.void);

export interface OnboardingRecordInput {
  // Section pacing was enabled for this run (TTY, first-run, not CI/agent).
  readonly paceOnboardingSections: boolean;
  // The run forces onboarding for a demo (replayable; never consumes the marker).
  readonly forceOnboarding: boolean;
  // The run is `--verbose` (a static review, no onboarding reveal).
  readonly verbose: boolean;
  // The run is non-interactive (CI, git hook, agent) and uses the classic layout.
  readonly isNonInteractiveEnvironment: boolean;
}

// Whether a completed render should burn the first-run onboarding marker: only
// when the interactive onboarding reveal actually ran. Verbose and the classic
// non-interactive layout (e.g. a git hook with a TTY, where GIT_DIR marks the
// run non-interactive while pacing still sees a TTY) pace section beats but
// never show the welcome scene / animated report, so they leave the first run
// intact. A forced demo replays every time and never consumes the marker.
export const shouldRecordOnboarding = (input: OnboardingRecordInput): boolean =>
  input.paceOnboardingSections &&
  !input.forceOnboarding &&
  !input.verbose &&
  !input.isNonInteractiveEnvironment;

// Whether onboarding animations can drive the stream — they need a real TTY.
// A forced demo animates even under an agent/CI shell (which `isSpinnerInteractive` rejects).
export const canAnimateOnboarding = (stream: NodeJS.WriteStream = process.stdout): boolean => {
  if (isOnboardingForced()) {
    return stream.isTTY === true && (stream.columns ?? 0) > 0 && process.env.TERM !== "dumb";
  }
  return isSpinnerInteractive(stream);
};
