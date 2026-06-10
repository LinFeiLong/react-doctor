import { describe, expect, it } from "vite-plus/test";
import { runCommand } from "../src/cli/utils/run-command.js";

describe("runCommand", () => {
  it("captures stdout from a successful command", async () => {
    const result = await runCommand(process.execPath, ["-e", "console.log('ok')"], process.cwd());
    expect(result).toEqual({ success: true, stdout: "ok", stderr: "" });
  });

  it("reports failure for a non-zero exit", async () => {
    const result = await runCommand(process.execPath, ["-e", "process.exit(2)"], process.cwd());
    expect(result.success).toBe(false);
  });

  it("reports failure for a missing binary", async () => {
    const result = await runCommand("definitely-not-a-real-binary", [], process.cwd());
    expect(result.success).toBe(false);
  });

  it("kills a hung command once timeoutMs expires", async () => {
    const startedAt = Date.now();
    const result = await runCommand(
      process.execPath,
      ["-e", "setTimeout(() => {}, 30000)"],
      process.cwd(),
      250,
    );
    expect(result.success).toBe(false);
    expect(Date.now() - startedAt).toBeLessThan(10000);
  });
});
