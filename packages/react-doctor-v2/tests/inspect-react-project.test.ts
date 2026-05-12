import path from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { createReactDoctor, inspectReactProject } from "../src/sdk/index.js";

describe("inspectReactProject", () => {
  it("returns a scaffold run result for the target project", async () => {
    const result = await inspectReactProject({ rootDirectory: "src" });

    expect(result.status).toBe("completed");
    expect(result.project).toEqual({
      rootDirectory: path.resolve("src"),
    });
    expect(result.issues).toEqual([]);
    expect(result.checks).toEqual([
      {
        id: "react-doctor/react-project-structure",
        name: "React project structure",
        status: "completed",
        issues: [],
        durationMilliseconds: expect.any(Number),
      },
    ]);
    expect(result.score).toBeNull();
    expect(result.startedAt).toEqual(expect.any(String));
    expect(result.completedAt).toEqual(expect.any(String));
    expect(result.durationMilliseconds).toEqual(expect.any(Number));
  });

  it("can disable rules through the inspection options", async () => {
    const result = await inspectReactProject({
      rootDirectory: "src",
      rules: {
        disabledRuleIds: ["react-doctor/react-project-structure"],
      },
    });

    expect(result.checks).toEqual([]);
  });
});

describe("createReactDoctor", () => {
  it("creates a reusable advanced SDK client with default options", async () => {
    const reactDoctor = createReactDoctor({ rootDirectory: "src" });
    const result = await reactDoctor.inspect();

    expect(result.project.rootDirectory).toBe(path.resolve("src"));
  });
});
