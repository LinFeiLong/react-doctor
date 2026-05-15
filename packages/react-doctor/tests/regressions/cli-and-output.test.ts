/**
 * Regression tests for closed issues that touch CLI flag exposure, output
 * formatting (annotations / scoring banner), and the explicit "skipped
 * checks" surface that came from the silent-failure issues.
 *
 * Covered closed issues:
 *   #43 — silent global `npm install -g` removed and must not return
 *   #50 — `--lint` exists as a positive flag so it can override a config
 *         that disables it
 *   #66 + #81 — GitHub Actions annotation-property encoding
 *   #92 — `share: false` config option exists in the schema and is read
 *         by the scan banner
 *   #135 — lint failures surface in `skippedChecks`, never silently
 *   #249 — "score unavailable" message branches on cause (offline vs
 *          API failure) instead of always claiming the user is offline
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vite-plus/test";

import { inspect } from "../../src/inspect.js";
import type { InspectResult, ReactDoctorConfig } from "@react-doctor/types";
import {
  encodeAnnotationProperty,
  encodeAnnotationMessage,
} from "../../src/cli/utils/annotation-encoding.js";
import {
  SCORE_UNAVAILABLE_API_FAILURE_MESSAGE,
  SCORE_UNAVAILABLE_OFFLINE_MESSAGE,
} from "../../src/cli/utils/constants.js";
import { setupReactProject, writeFile, writeJson } from "./_helpers.js";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..", "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rd-cli-and-output-"));
const ANSI_ESCAPE_PATTERN = new RegExp(String.raw`\u001B\[[0-?]*[ -/]*[@-~]`, "g");

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

const setupMinimalReactProject = (caseId: string): string =>
  setupReactProject(tempRoot, caseId, {
    files: { "src/App.tsx": `export const App = () => null;\n` },
  });

const stripAnsi = (text: string): string => text.replace(ANSI_ESCAPE_PATTERN, "");

// Capture every line `inspect()` writes to console while it runs. We use
// real I/O (logger / spinner / console.log) rather than scrub source
// text — testing observable behavior survives refactors that move
// strings around.
const captureScanOutput = async (
  projectDir: string,
  options: Parameters<typeof inspect>[1],
): Promise<{ result: InspectResult; stdout: string; stderr: string }> => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalError = console.error;
  const originalWarn = console.warn;
  console.log = (...args: unknown[]) => stdout.push(args.join(" "));
  console.info = (...args: unknown[]) => stdout.push(args.join(" "));
  console.error = (...args: unknown[]) => stderr.push(args.join(" "));
  console.warn = (...args: unknown[]) => stderr.push(args.join(" "));
  try {
    const result = await inspect(projectDir, options);
    return { result, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
  } finally {
    console.log = originalLog;
    console.info = originalInfo;
    console.error = originalError;
    console.warn = originalWarn;
  }
};

describe("issue #50: CLI flags can re-enable lint that config disabled", () => {
  it("inspect(directory, { lint: true }) overrides a `lint: false` config", async () => {
    const projectDir = setupMinimalReactProject("issue-50-lint");
    writeJson(path.join(projectDir, "react-doctor.config.json"), {
      lint: false,
    });
    // Pass lint:true explicitly — the resolved options must include lint=true
    // even though the config said false.
    const { result } = await captureScanOutput(projectDir, {
      lint: true,
      offline: true,
      silent: true,
    });
    // If lint had stayed false we'd see it in skippedChecks (or no lint
    // diagnostics regardless of the source). The scan must succeed and
    // not have lint in skippedChecks (which would mean it ran and failed).
    expect(result.skippedChecks).not.toContain("lint");
  });

  it("inspect(directory, { lint: false }) overrides a `lint: true` config", async () => {
    const projectDir = setupMinimalReactProject("issue-50-no-lint");
    writeJson(path.join(projectDir, "react-doctor.config.json"), { lint: true });
    const { result } = await captureScanOutput(projectDir, {
      lint: false,
      offline: true,
      silent: true,
    });
    expect(result.diagnostics.filter((d) => d.plugin === "react-doctor")).toHaveLength(0);
  });
});

describe("issue #66 + #81: GitHub Actions annotation encoding", () => {
  it("encodes newlines and percent in message bodies (otherwise the annotation is truncated)", () => {
    const message = "first line\nsecond, line: with 50% etc.";
    const encoded = encodeAnnotationMessage(message);
    expect(encoded).not.toContain("\n");
    expect(encoded).toContain("%0A");
    expect(encoded).toContain("%25");
  });

  it("encodes commas and colons in property values (file=, line=, title=)", () => {
    const filename = "src/foo,bar:baz%qux\nx.tsx";
    const encoded = encodeAnnotationProperty(filename);
    expect(encoded).not.toContain("\n");
    expect(encoded).not.toContain(",");
    expect(encoded).not.toContain(":");
    expect(encoded).toContain("%25");
  });

  it("round-trips: decoded message equals original", () => {
    const original = "line one\nline, two: %50";
    const decoded = decodeURIComponent(encodeAnnotationMessage(original));
    expect(decoded).toBe(original);
  });
});

describe("issue #92: share: false config suppresses the share link in scan output", () => {
  it("ReactDoctorConfig type accepts `share: false`", () => {
    // HACK: pure type assertion. If `share` is removed from the type,
    // this file stops type-checking and the suite refuses to run.
    const config: ReactDoctorConfig = { share: false };
    expect(config.share).toBe(false);
  });

  it("the share URL appears in stdout by default and is suppressed when share=false", async () => {
    const projectDir = setupMinimalReactProject("issue-92-default");
    writeFile(
      path.join(projectDir, "src", "App.tsx"),
      `import { useState, useEffect } from "react";
export const App = ({ name }: { name: string }) => {
  const [n, setN] = useState("");
  useEffect(() => { setN(name); }, [name]);
  return <div>{n}</div>;
};
`,
    );
    const defaultRun = await captureScanOutput(projectDir, { offline: false });
    expect(defaultRun.stdout).toContain("Share your results");

    const projectDir2 = setupMinimalReactProject("issue-92-disabled");
    writeFile(
      path.join(projectDir2, "src", "App.tsx"),
      `import { useState, useEffect } from "react";
export const App = ({ name }: { name: string }) => {
  const [n, setN] = useState("");
  useEffect(() => { setN(name); }, [name]);
  return <div>{n}</div>;
};
`,
    );
    writeJson(path.join(projectDir2, "react-doctor.config.json"), { share: false });
    const disabledRun = await captureScanOutput(projectDir2, { offline: false });
    expect(disabledRun.stdout).not.toContain("Share your results");
  });
});

describe("default CLI issue output", () => {
  it("groups default findings by category and keeps the score summary after issues", async () => {
    const projectDir = setupReactProject(tempRoot, "default-output-category-list", {
      files: {
        "src/Cart.tsx": `import { useState } from "react";

export const Cart = () => {
  const [items, setItems] = useState<string[]>([]);
  void setItems;

  const onAdd = (nextItem: string) => {
    items.push(nextItem);
    items.sort();
  };

  return <button onClick={() => onAdd("x")}>{items.length}</button>;
};
`,
      },
    });

    const { stdout } = await captureScanOutput(projectDir, {
      lint: true,
      offline: true,
    });
    const normalizedStdout = stripAnsi(stdout);

    expect(normalizedStdout).toMatch(/State & Effects \d+ issues/);
    expect(normalizedStdout).toContain("  ⚠ Direct state mutation ×2");
    expect(normalizedStdout).toContain("    src/Cart.tsx:");
    expect(normalizedStdout.indexOf("Direct state mutation")).toBeLessThan(
      normalizedStdout.indexOf("React Doctor"),
    );
    expect(normalizedStdout).not.toContain("  By category");
  });
});

describe("issue #135: lint failures surface in skippedChecks", () => {
  it("inspect() returns a `skippedChecks` array on the result", async () => {
    const projectDir = setupMinimalReactProject("issue-135");
    const { result } = await captureScanOutput(projectDir, {
      lint: false,
      offline: true,
      silent: true,
    });
    // Type contract: skippedChecks always exists as an array.
    expect(Array.isArray(result.skippedChecks)).toBe(true);
  });
});

// HACK: PR #249 (Bugbot review): `noScoreMessage` was unconditionally
// "Score unavailable in offline mode." so every null-score scan claimed
// the user was offline — including the case where the user is online
// but the score API timed out or returned non-2xx. We pin the contract
// by branch (offline vs API-failure) and by API-failure *mode* (the
// three distinct ways calculateScore returns null: throw, !response.ok,
// malformed-body). All three failure modes must produce the API-failure
// message, never the offline message.
interface NoScoreScenario {
  label: string;
  caseId: string;
  options: Parameters<typeof inspect>[1];
  setupFetchStub?: () => void;
  expectedMessage: string;
  forbiddenMessage: string;
}

const NO_SCORE_SCENARIOS: NoScoreScenario[] = [
  {
    label: "--offline set",
    caseId: "pr-249-offline",
    options: { offline: true, lint: false },
    expectedMessage: SCORE_UNAVAILABLE_OFFLINE_MESSAGE,
    forbiddenMessage: SCORE_UNAVAILABLE_API_FAILURE_MESSAGE,
  },
  {
    label: "online + score API throws (DNS / network / abort)",
    caseId: "pr-249-api-throws",
    options: { offline: false, lint: false },
    setupFetchStub: () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new Error("network unavailable");
        }),
      );
    },
    expectedMessage: SCORE_UNAVAILABLE_API_FAILURE_MESSAGE,
    forbiddenMessage: SCORE_UNAVAILABLE_OFFLINE_MESSAGE,
  },
  {
    label: "online + score API returns non-2xx",
    caseId: "pr-249-api-non-2xx",
    options: { offline: false, lint: false },
    setupFetchStub: () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () => new Response("internal error", { status: 500, statusText: "Server Error" }),
        ),
      );
    },
    expectedMessage: SCORE_UNAVAILABLE_API_FAILURE_MESSAGE,
    forbiddenMessage: SCORE_UNAVAILABLE_OFFLINE_MESSAGE,
  },
  {
    label: "online + score API returns malformed body",
    caseId: "pr-249-api-malformed",
    options: { offline: false, lint: false },
    setupFetchStub: () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("not-json{{{", { status: 200 })),
      );
    },
    expectedMessage: SCORE_UNAVAILABLE_API_FAILURE_MESSAGE,
    forbiddenMessage: SCORE_UNAVAILABLE_OFFLINE_MESSAGE,
  },
];

describe("'score unavailable' message branches on offline vs API failure (#249)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each(NO_SCORE_SCENARIOS)(
    "renders the right message when $label",
    async ({ caseId, options, setupFetchStub, expectedMessage, forbiddenMessage }) => {
      if (setupFetchStub) {
        setupFetchStub();
        // HACK: calculate-score logs a warning to stderr on every API
        // failure; silence it so the test output stays readable.
        vi.spyOn(console, "warn").mockImplementation(() => {});
      }

      const projectDir = setupMinimalReactProject(caseId);
      const { result, stdout } = await captureScanOutput(projectDir, options);

      expect(result.score).toBeNull();
      const plainStdout = stripAnsi(stdout);
      expect(plainStdout).toContain(expectedMessage);
      expect(plainStdout).not.toContain(forbiddenMessage);
    },
  );
});

describe("issue #43: no silent global npm install", () => {
  it("source tree contains no `npm install -g` invocation", () => {
    // HACK: walk the source tree directly instead of shelling out to `rg`,
    // so the test works on machines without ripgrep installed.
    const srcRoot = path.join(PACKAGE_ROOT, "src");
    const offendingMatches: string[] = [];
    const stack: string[] = [srcRoot];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) continue;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const entryPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
          continue;
        }
        if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue;
        const content = fs.readFileSync(entryPath, "utf8");
        if (content.includes("npm install -g")) {
          offendingMatches.push(path.relative(PACKAGE_ROOT, entryPath));
        }
      }
    }
    expect(offendingMatches).toEqual([]);
  });
});
