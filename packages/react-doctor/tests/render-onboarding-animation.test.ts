import * as Effect from "effect/Effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { Diagnostic, ScoreResult } from "@react-doctor/core";
import { animateScoreProjection } from "../src/cli/utils/render-score-header.js";
import {
  buildMergedOverflowLine,
  printCategoryBreakdown,
  printWarningRollup,
} from "../src/cli/utils/render-diagnostics.js";
import { playWelcomeScene } from "../src/cli/utils/render-welcome.js";
import {
  canAnimateOnboarding,
  FORCE_ONBOARDING_ENV_VAR,
} from "../src/cli/utils/onboarding-pacing.js";

const ANSI = new RegExp(String.raw`\u001B\[[0-?]*[ -/]*[@-~]`, "g");
const stripAnsi = (text: string): string => text.replace(ANSI, "");

// Captures both sinks the renderers use: the static path prints via
// `Console.log` (→ console.log) while the animated path writes raw cursor
// controls straight to `process.stdout.write`.
const captureStdout = async (run: () => Promise<void>): Promise<string[]> => {
  const writes: string[] = [];
  const logSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    writes.push(`${args.join(" ")}\n`);
  });
  const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    writes.push(String(chunk));
    return true;
  });
  try {
    await run();
  } finally {
    logSpy.mockRestore();
    writeSpy.mockRestore();
  }
  return writes;
};

const makeDiagnostic = (
  category: string,
  severity: "error" | "warning",
  rule = `${category.toLowerCase()}-${severity}`,
): Diagnostic =>
  ({
    filePath: "src/App.tsx",
    plugin: "react-doctor",
    rule,
    severity,
    message: "",
    help: "",
    line: 1,
    column: 1,
    category,
  }) as Diagnostic;

describe("playWelcomeScene", () => {
  it("types the greeting in beside the happy face, then erases it", async () => {
    const writes = await captureStdout(() => Effect.runPromise(playWelcomeScene()));
    const output = writes.join("");
    expect(stripAnsi(output)).toContain("Welcome to React Doctor");
    // The middle sentence explains what React Doctor does, then is replaced in
    // place by the closing line.
    expect(stripAnsi(output)).toContain("I diagnose your React code");
    expect(stripAnsi(output)).toContain("Let's scan your codebase");
    expect(output).toContain("◠ ◠");
    // Typewriter: many incremental frames, and an early partial reveal.
    expect(writes.length).toBeGreaterThan(20);
    expect(stripAnsi(writes[5] ?? "")).not.toContain("Welcome to React Doctor");
    // After the hold, the cursor moves up over the block (incl. the blank line)
    // and clears to the end of the screen.
    expect(output).toContain("\u001B[3A");
    expect(output).toContain("\u001B[0J");
  });
});

describe("printCategoryBreakdown", () => {
  const diagnostics = [
    makeDiagnostic("Bugs", "error"),
    makeDiagnostic("Bugs", "error"),
    makeDiagnostic("Performance", "warning"),
  ];

  it("prints final tallies at once when not animating", async () => {
    const writes = await captureStdout(() =>
      Effect.runPromise(printCategoryBreakdown(diagnostics, undefined, false)),
    );
    const output = stripAnsi(writes.join(""));
    expect(output).toContain("2 errors");
    expect(output).toContain("1 warning");
    // No cursor-control frames in the static path.
    expect(writes.join("")).not.toContain("\u001B[2A");
  });

  it("counts up to the final tallies when animating", async () => {
    const writes = await captureStdout(() =>
      Effect.runPromise(printCategoryBreakdown(diagnostics, undefined, true)),
    );
    // Redraw frames move the cursor up over the two category lines.
    expect(writes.join("")).toContain("\u001B[2A");
    // The settled (last) frame shows the real counts.
    const lastFrame = stripAnsi(writes[writes.length - 1] ?? "");
    expect(lastFrame).toContain("Bugs");
    expect(lastFrame).toContain("2 errors");
    expect(lastFrame).toContain("Performance");
    expect(lastFrame).toContain("1 warning");
  });
});

describe("printWarningRollup", () => {
  const diagnostics = [
    makeDiagnostic("Bugs", "warning", "react-doctor/aaa"),
    makeDiagnostic("Bugs", "warning", "react-doctor/bbbbbbbbb"),
  ];

  it("prints the rule list at once when not animating", async () => {
    const writes = await captureStdout(() =>
      Effect.runPromise(printWarningRollup(diagnostics, undefined, false)),
    );
    const output = stripAnsi(writes.join(""));
    expect(output).toContain("react-doctor/aaa");
    expect(output).toContain("react-doctor/bbbbbbbbb");
    expect(writes.join("")).not.toContain("\u001B[2A");
  });

  it("types the rule names in parallel when animating", async () => {
    const writes = await captureStdout(() =>
      Effect.runPromise(printWarningRollup(diagnostics, undefined, true)),
    );
    // Redraw frames move the cursor up over both warning lines.
    expect(writes.join("")).toContain("\u001B[2A");
    // The settled (last) frame shows both full rule names.
    const lastFrame = stripAnsi(writes[writes.length - 1] ?? "");
    expect(lastFrame).toContain("react-doctor/aaa");
    expect(lastFrame).toContain("react-doctor/bbbbbbbbb");
  });
});

describe("buildMergedOverflowLine", () => {
  it("leads with 'We also found' and counts the overflow rule groups", () => {
    const diagnostics = [
      ...Array.from({ length: 5 }, (_, index) => makeDiagnostic("Bugs", "error", `err-${index}`)),
      ...Array.from({ length: 12 }, (_, index) =>
        makeDiagnostic("Bugs", "warning", `warn-${index}`),
      ),
    ];
    const line = stripAnsi(buildMergedOverflowLine(diagnostics) ?? "");
    expect(line).toContain("We also found");
    expect(line).toContain("+2 more errors");
    expect(line).toContain("+2 more warnings");
  });

  it("is null when nothing overflows the shown rules", () => {
    expect(buildMergedOverflowLine([makeDiagnostic("Bugs", "error")])).toBeNull();
  });
});

describe("animateScoreProjection", () => {
  it("grows the ghost gain segment in over multiple frames, redrawing in place", async () => {
    const scoreResult = { score: 20, label: "Critical" } as ScoreResult;
    const writes = await captureStdout(() =>
      Effect.runPromise(animateScoreProjection(scoreResult, 60, 5)),
    );
    const output = writes.join("");
    // Animated: many redraw frames, each jumping up to the bar and back.
    expect(writes.length).toBeGreaterThan(5);
    expect(output).toContain("\u001B[5A");
    expect(output).toContain("\u001B[5B");
    // The settled frame shows the projected gain (▓) in the bar.
    expect(stripAnsi(writes[writes.length - 1] ?? "")).toContain("▓");
  });

  it("is a no-op for a perfect score", async () => {
    const scoreResult = { score: 100, label: "Great" } as ScoreResult;
    const writes = await captureStdout(() =>
      Effect.runPromise(animateScoreProjection(scoreResult, 100, 5)),
    );
    expect(writes.join("")).toBe("");
  });
});

describe("canAnimateOnboarding", () => {
  let savedForce: string | undefined;
  let savedTerm: string | undefined;

  beforeEach(() => {
    savedForce = process.env[FORCE_ONBOARDING_ENV_VAR];
    savedTerm = process.env.TERM;
    delete process.env[FORCE_ONBOARDING_ENV_VAR];
    process.env.TERM = "xterm-256color";
  });

  afterEach(() => {
    if (savedForce === undefined) delete process.env[FORCE_ONBOARDING_ENV_VAR];
    else process.env[FORCE_ONBOARDING_ENV_VAR] = savedForce;
    if (savedTerm === undefined) delete process.env.TERM;
    else process.env.TERM = savedTerm;
  });

  it("animates a forced run on a real TTY (regardless of agent/CI detection)", () => {
    process.env[FORCE_ONBOARDING_ENV_VAR] = "1";
    const stream = { isTTY: true, columns: 80 } as unknown as NodeJS.WriteStream;
    expect(canAnimateOnboarding(stream)).toBe(true);
  });

  it("does not animate a forced run when the stream is not a TTY", () => {
    process.env[FORCE_ONBOARDING_ENV_VAR] = "1";
    const stream = { isTTY: false, columns: 0 } as unknown as NodeJS.WriteStream;
    expect(canAnimateOnboarding(stream)).toBe(false);
  });
});
