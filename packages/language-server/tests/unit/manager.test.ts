import { describe, expect, it } from "vite-plus/test";
import type { Diagnostic as CoreDiagnostic } from "@react-doctor/core";
import { DiagnosticsManager } from "../../src/diagnostics/manager.js";
import type { ScanOutcome, ScanRequest } from "../../src/types.js";

const FS_PATH = "/proj/src/App.tsx";

const request: ScanRequest = {
  id: 1,
  priority: "save",
  projectDirectory: "/proj",
  files: [FS_PATH],
  runDeadCode: false,
  useOverlay: false,
  reason: "test",
};

const diagnostic = (): CoreDiagnostic => ({
  filePath: "src/App.tsx",
  plugin: "react-doctor",
  rule: "no-array-index-key",
  severity: "warning",
  message: "msg",
  help: "help",
  line: 1,
  column: 1,
  category: "Correctness",
});

const outcome = (overrides: Partial<ScanOutcome>): ScanOutcome => ({
  request,
  ok: true,
  skipped: false,
  byFile: new Map(),
  coversProject: false,
  requestedPaths: [FS_PATH],
  project: null,
  didLintFail: false,
  lintFailureReason: null,
  error: null,
  ...overrides,
});

const createManager = () => {
  const cleared: string[] = [];
  const manager = new DiagnosticsManager({
    publish: (uri, diagnostics) => {
      if (diagnostics.length === 0) cleared.push(uri);
    },
    textProvider: () => "const App = () => null\n",
  });
  return { manager, cleared };
};

describe("DiagnosticsManager.applyOutcome", () => {
  it("clears a previously-flagged file when a successful scan finds it clean", () => {
    const { manager } = createManager();
    manager.applyOutcome(outcome({ byFile: new Map([[FS_PATH, [diagnostic()]]]) }));
    const [uri] = manager.trackedUris();
    expect(manager.get(uri).length).toBe(1);

    // Clean successful scan → diagnostics cleared.
    manager.applyOutcome(outcome({ byFile: new Map() }));
    expect(manager.get(uri).length).toBe(0);
  });

  it("preserves diagnostics when the scan failed (does not strip on transient errors)", () => {
    const { manager, cleared } = createManager();
    manager.applyOutcome(outcome({ byFile: new Map([[FS_PATH, [diagnostic()]]]) }));
    const [uri] = manager.trackedUris();
    cleared.length = 0;

    manager.applyOutcome(outcome({ ok: false, error: "oxlint crashed" }));
    expect(manager.get(uri).length).toBe(1);
    expect(cleared).not.toContain(uri);
  });

  it("preserves diagnostics when lint degraded (didLintFail)", () => {
    const { manager, cleared } = createManager();
    manager.applyOutcome(outcome({ byFile: new Map([[FS_PATH, [diagnostic()]]]) }));
    const [uri] = manager.trackedUris();
    cleared.length = 0;

    manager.applyOutcome(outcome({ didLintFail: true, lintFailureReason: "partial" }));
    expect(manager.get(uri).length).toBe(1);
    expect(cleared).not.toContain(uri);
  });
});
