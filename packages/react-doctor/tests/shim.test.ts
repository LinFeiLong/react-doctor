import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { diagnose as diagnoseFromMainSdk } from "../src/sdk/index.js";
import { diagnose } from "../src/sdk/compat.js";

const createdFixtureDirectories: string[] = [];

const createFixtureProject = async (files: Record<string, string>): Promise<string> => {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "react-doctor-shim-"));
  createdFixtureDirectories.push(rootDirectory);
  await Promise.all(
    Object.entries(files).map(async ([relativePath, sourceText]) => {
      const filePath = path.join(rootDirectory, relativePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, sourceText);
    }),
  );
  return rootDirectory;
};

afterEach(async () => {
  while (createdFixtureDirectories.length > 0) {
    const fixtureDirectory = createdFixtureDirectories.pop();
    if (!fixtureDirectory) continue;
    await fs.rm(fixtureDirectory, { recursive: true, force: true });
  }
});

describe("deprecated API shim", () => {
  it("maps diagnose() to the advanced SDK result", async () => {
    const result = await diagnose("src", { lint: false, deadCode: false });

    expect(result).toEqual({
      diagnostics: [],
      score: {
        score: 100,
        label: "Great",
      },
      project: {
        rootDirectory: path.resolve("src"),
        projectName: "react-doctor",
        reactVersion: null,
        tailwindVersion: expect.anything(),
        framework: "unknown",
        hasTypeScript: true,
        hasReactCompiler: false,
        hasTanStackQuery: false,
        sourceFileCount: expect.any(Number),
      },
      elapsedMilliseconds: expect.any(Number),
    });
  });

  it("exports diagnose() alongside the main SDK", async () => {
    const result = await diagnoseFromMainSdk("src");

    expect(result.project.rootDirectory).toBe(path.resolve("src"));
  });

  it("runs lint and dead-code checks by default", async () => {
    const rootDirectory = await createFixtureProject({
      "package.json": JSON.stringify({
        name: "web",
        dependencies: { react: "^19.0.0" },
      }),
      "src/main.tsx": "import { App } from './app';\nconsole.log(App);\n",
      "src/app.tsx": "export const App = () => null;\nexport const Unused = 1;\n",
    });

    const result = await diagnose(rootDirectory);

    expect(result.diagnostics.map((diagnostic) => diagnostic.rule)).toContain("unused-export");
  });

  it("respects react-doctor.config.json `deadCode: false` over compat defaults", async () => {
    const rootDirectory = await createFixtureProject({
      "react-doctor.config.json": JSON.stringify({ deadCode: false, lint: false }),
      "package.json": JSON.stringify({
        name: "web",
        dependencies: { react: "^19.0.0" },
      }),
      "src/main.tsx": "import { App } from './app';\nconsole.log(App);\n",
      "src/app.tsx": "export const App = () => null;\nexport const Unused = 1;\n",
    });

    const result = await diagnose(rootDirectory);

    expect(result.diagnostics).toEqual([]);
  });

  it("still applies caller-supplied lint flag even when disk config disables it", async () => {
    const rootDirectory = await createFixtureProject({
      "react-doctor.config.json": JSON.stringify({ deadCode: false, lint: false }),
      "package.json": JSON.stringify({
        name: "web",
        dependencies: { react: "^19.0.0" },
      }),
      "src/main.tsx": "import { App } from './app';\nconsole.log(App);\n",
      "src/app.tsx": "export const App = () => null;\nexport const Unused = 1;\n",
    });

    const result = await diagnose(rootDirectory, { deadCode: true });

    expect(result.diagnostics.map((diagnostic) => diagnostic.rule)).toContain("unused-export");
  });
});
