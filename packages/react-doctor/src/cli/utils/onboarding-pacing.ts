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

// Whether onboarding animations can drive the stream — they need a real TTY.
// A forced demo animates even under an agent/CI shell (which `isSpinnerInteractive` rejects).
export const canAnimateOnboarding = (stream: NodeJS.WriteStream = process.stdout): boolean => {
  if (isOnboardingForced()) {
    return stream.isTTY === true && (stream.columns ?? 0) > 0 && process.env.TERM !== "dumb";
  }
  return isSpinnerInteractive(stream);
};
