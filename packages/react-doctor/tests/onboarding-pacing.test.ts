import { performance } from "node:perf_hooks";
import * as Effect from "effect/Effect";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  CI_ENVIRONMENT_VARIABLES,
  CODING_AGENT_ENVIRONMENT_VALUE_VARIABLES,
  CODING_AGENT_ENVIRONMENT_VARIABLES,
} from "../src/cli/utils/is-ci-environment.js";
import {
  FORCE_ONBOARDING_ENV_VAR,
  isOnboardingForced,
  ONBOARDING_SECTION_DELAY_MS,
  onboardingSectionPause,
  shouldPaceOnboardingSections,
  shouldRecordOnboarding,
} from "../src/cli/utils/onboarding-pacing.js";

describe("shouldPaceOnboardingSections", () => {
  let savedForce: string | undefined;

  beforeEach(() => {
    savedForce = process.env[FORCE_ONBOARDING_ENV_VAR];
    delete process.env[FORCE_ONBOARDING_ENV_VAR];
  });

  afterEach(() => {
    if (savedForce === undefined) {
      delete process.env[FORCE_ONBOARDING_ENV_VAR];
    } else {
      process.env[FORCE_ONBOARDING_ENV_VAR] = savedForce;
    }
  });

  it("paces an interactive human run", () => {
    expect(shouldPaceOnboardingSections({ isInteractive: true, isCiOrCodingAgent: false })).toBe(
      true,
    );
  });

  it("does not pace a non-interactive (piped) run", () => {
    expect(shouldPaceOnboardingSections({ isInteractive: false, isCiOrCodingAgent: false })).toBe(
      false,
    );
  });

  it("does not pace CI or coding-agent runs even on a TTY", () => {
    expect(shouldPaceOnboardingSections({ isInteractive: true, isCiOrCodingAgent: true })).toBe(
      false,
    );
  });

  it("paces regardless of environment when forced", () => {
    process.env[FORCE_ONBOARDING_ENV_VAR] = "1";
    expect(shouldPaceOnboardingSections({ isInteractive: false, isCiOrCodingAgent: true })).toBe(
      true,
    );
  });

  describe("env-driven defaults", () => {
    const ENVIRONMENT_VARIABLES = [
      "CI",
      ...CI_ENVIRONMENT_VARIABLES,
      ...CODING_AGENT_ENVIRONMENT_VARIABLES,
      ...CODING_AGENT_ENVIRONMENT_VALUE_VARIABLES,
    ] as const;
    let savedEnv: Record<string, string | undefined>;

    beforeEach(() => {
      savedEnv = {};
      for (const envVariable of ENVIRONMENT_VARIABLES) {
        savedEnv[envVariable] = process.env[envVariable];
        delete process.env[envVariable];
      }
    });

    afterEach(() => {
      for (const envVariable of ENVIRONMENT_VARIABLES) {
        const previousValue = savedEnv[envVariable];
        if (previousValue === undefined) {
          delete process.env[envVariable];
        } else {
          process.env[envVariable] = previousValue;
        }
      }
    });

    it("falls back to the live CI/agent probe", () => {
      expect(shouldPaceOnboardingSections({ isInteractive: true })).toBe(true);
      process.env.CI = "true";
      expect(shouldPaceOnboardingSections({ isInteractive: true })).toBe(false);
    });

    it("falls back to the coding-agent probe", () => {
      process.env.CURSOR_AGENT = "1";
      expect(shouldPaceOnboardingSections({ isInteractive: true })).toBe(false);
    });
  });
});

describe("isOnboardingForced", () => {
  it("is false when the flag is unset", () => {
    expect(isOnboardingForced({})).toBe(false);
  });

  it("is true for truthy values", () => {
    expect(isOnboardingForced({ [FORCE_ONBOARDING_ENV_VAR]: "1" })).toBe(true);
    expect(isOnboardingForced({ [FORCE_ONBOARDING_ENV_VAR]: "true" })).toBe(true);
  });

  it("is false for explicit falsy values", () => {
    expect(isOnboardingForced({ [FORCE_ONBOARDING_ENV_VAR]: "0" })).toBe(false);
    expect(isOnboardingForced({ [FORCE_ONBOARDING_ENV_VAR]: "false" })).toBe(false);
    expect(isOnboardingForced({ [FORCE_ONBOARDING_ENV_VAR]: "" })).toBe(false);
  });
});

describe("shouldRecordOnboarding", () => {
  const baseInput = {
    paceOnboardingSections: true,
    forceOnboarding: false,
    verbose: false,
    isNonInteractiveEnvironment: false,
  };

  it("records after an interactive onboarding reveal", () => {
    expect(shouldRecordOnboarding(baseInput)).toBe(true);
  });

  it("does not record when pacing was off (no reveal)", () => {
    expect(shouldRecordOnboarding({ ...baseInput, paceOnboardingSections: false })).toBe(false);
  });

  it("does not record a forced demo, so it stays replayable", () => {
    expect(shouldRecordOnboarding({ ...baseInput, forceOnboarding: true })).toBe(false);
  });

  it("does not record a verbose run (static review, no reveal)", () => {
    expect(shouldRecordOnboarding({ ...baseInput, verbose: true })).toBe(false);
  });

  it("does not record a non-interactive run that paced but used the classic layout", () => {
    // Regression: a git hook with a TTY (GIT_DIR set) leaves pacing's TTY probe
    // true while routing to the classic layout, so it must not burn the marker.
    expect(shouldRecordOnboarding({ ...baseInput, isNonInteractiveEnvironment: true })).toBe(false);
  });
});

describe("onboardingSectionPause", () => {
  it("is a no-op when pacing is off", async () => {
    expect(onboardingSectionPause(false)).toBe(Effect.void);

    const start = performance.now();
    await Effect.runPromise(onboardingSectionPause(false));
    expect(performance.now() - start).toBeLessThan(50);
  });

  it("waits the configured delay when pacing is on", async () => {
    expect(ONBOARDING_SECTION_DELAY_MS).toBe(850);

    const start = performance.now();
    await Effect.runPromise(onboardingSectionPause(true));
    // Generous lower bound: a real sleep never returns early, but timer
    // granularity / CI jitter can shave a few milliseconds off the wall clock.
    expect(performance.now() - start).toBeGreaterThanOrEqual(700);
  });
});
