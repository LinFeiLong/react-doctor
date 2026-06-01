import { describe, it } from "vite-plus/test";
import * as Effect from "effect/Effect";
import type { Diagnostic } from "@react-doctor/core";
import { printDiagnostics } from "../src/cli/utils/render-diagnostics.js";

describe("tmp more preview", () => {
  it("prints", async () => {
    const diagnostics: Diagnostic[] = [];
    for (let i = 0; i < 11; i += 1) {
      diagnostics.push({
        filePath: `src/e-${i}.tsx`, plugin: "react-doctor", rule: `error-rule-${i}`,
        severity: "error", title: `Error ${i}`, message: "err", help: "fix", line: i + 1, column: 1, category: "Bugs",
      } as Diagnostic);
    }
    for (let i = 0; i < 12; i += 1) {
      diagnostics.push({
        filePath: `src/w-${i}.tsx`, plugin: "react-doctor", rule: `warning-rule-${i}`,
        severity: "warning", message: "warn", help: "fix", line: i + 1, column: 1, category: "Performance",
      } as Diagnostic);
    }
    await Effect.runPromise(printDiagnostics(diagnostics, false, "/tmp"));
  });
});
