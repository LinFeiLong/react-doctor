import path from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { diagnose as diagnoseFromMainSdk } from "../src/sdk/index.js";
import { diagnose } from "../src/sdk/compat.js";

describe("deprecated API shim", () => {
  it("maps diagnose() to the advanced SDK result", async () => {
    const result = await diagnose("src");

    expect(result).toEqual({
      diagnostics: [],
      score: null,
      project: {
        rootDirectory: path.resolve("src"),
        projectName: "src",
        reactVersion: null,
        tailwindVersion: null,
        framework: "unknown",
        hasTypeScript: false,
        hasReactCompiler: false,
        hasTanStackQuery: false,
        sourceFileCount: 0,
      },
      elapsedMilliseconds: expect.any(Number),
    });
  });

  it("exports diagnose() alongside the main SDK", async () => {
    const result = await diagnoseFromMainSdk("src");

    expect(result.project.rootDirectory).toBe(path.resolve("src"));
  });
});
