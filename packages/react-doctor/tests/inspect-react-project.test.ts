import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  DEAD_CODE_RULE_ID,
  createReactDoctor,
  inspectReactProject,
  loadReactDoctorConfig,
} from "../src/sdk/index.js";

const createdFixtureDirectories: string[] = [];

const createFixtureProject = async (files: Record<string, string>): Promise<string> => {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "react-doctor-inspect-"));
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

describe("inspectReactProject", () => {
  it("returns a scaffold run result for the target project", async () => {
    const result = await inspectReactProject({ rootDirectory: "src" });

    expect(result.status).toBe("completed");
    expect(result.project).toMatchObject({
      rootDirectory: path.resolve("src"),
      projectName: "react-doctor",
      framework: "unknown",
      hasTypeScript: true,
      reactVersion: null,
      sourceFileCount: expect.any(Number),
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
    expect(result.score).toEqual({ value: 100, label: "Great" });
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

  it("loads config from ancestors and resolves rootDir from the config source", async () => {
    const rootDirectory = await createFixtureProject({
      "react-doctor.config.json": JSON.stringify({
        rootDir: "apps/web",
        deadCode: true,
      }),
      "apps/web/package.json": JSON.stringify({
        name: "web",
        dependencies: { react: "^19.0.0" },
      }),
      "apps/web/src/main.tsx": "import { App } from './app';\nconsole.log(App);\n",
      "apps/web/src/app.tsx": "export const App = () => null;\nexport const Unused = 1;\n",
    });

    const result = await inspectReactProject({ rootDirectory });

    expect(result.project.rootDirectory).toBe(path.join(rootDirectory, "apps/web"));
    expect(result.project.projectName).toBe("web");
    expect(result.checks.map((check) => check.id)).toContain(DEAD_CODE_RULE_ID);
    expect(result.issues.map((issue) => issue.id)).toContain(
      `${DEAD_CODE_RULE_ID}/unused-export/src/app.tsx/Unused`,
    );
  });

  it("resolves rootDir when callers pass a loaded config with option overrides", async () => {
    const rootDirectory = await createFixtureProject({
      "react-doctor.config.json": JSON.stringify({
        rootDir: "apps/web",
        deadCode: false,
      }),
      "apps/web/package.json": JSON.stringify({
        name: "web",
        dependencies: { react: "^19.0.0" },
      }),
      "apps/web/src/main.tsx": "import { App } from './app';\nconsole.log(App);\n",
      "apps/web/src/app.tsx": "export const App = () => null;\nexport const Unused = 1;\n",
    });
    const loadedConfig = await loadReactDoctorConfig(rootDirectory);

    const result = await inspectReactProject({
      rootDirectory,
      loadedConfig,
      config: loadedConfig?.config,
      deadCode: true,
    });

    expect(result.project.rootDirectory).toBe(path.join(rootDirectory, "apps/web"));
    expect(result.issues.map((issue) => issue.id)).toContain(
      `${DEAD_CODE_RULE_ID}/unused-export/src/app.tsx/Unused`,
    );
  });

  it("accepts offline mode in react-doctor config", async () => {
    const rootDirectory = await createFixtureProject({
      "react-doctor.config.json": JSON.stringify({ offline: true }),
      "src/main.tsx": "console.log('ok');\n",
    });

    const loadedConfig = await loadReactDoctorConfig(rootDirectory);

    expect(loadedConfig?.config.offline).toBe(true);
  });

  it("resolves Bun grouped catalog versions during project discovery", async () => {
    const rootDirectory = await createFixtureProject({
      "package.json": JSON.stringify({
        name: "workspace",
        workspaces: {
          packages: ["apps/*"],
          catalogs: {
            react19: {
              react: "^19.0.0",
            },
          },
        },
      }),
      "apps/web/package.json": JSON.stringify({
        name: "web",
        dependencies: {
          react: "catalog:react19",
        },
      }),
      "apps/web/src/main.tsx": "console.log('ok');\n",
    });

    const result = await inspectReactProject({
      rootDirectory: path.join(rootDirectory, "apps/web"),
    });

    expect(result.project.reactVersion).toBe("^19.0.0");
    expect(result.project.reactMajorVersion).toBe(19);
  });

  it("detects React Compiler from framework config files", async () => {
    const rootDirectory = await createFixtureProject({
      "package.json": JSON.stringify({
        name: "web",
        dependencies: { react: "^19.0.0", next: "^16.0.0" },
      }),
      "next.config.ts": "export default { reactCompiler: true };\n",
      "src/main.tsx": "console.log('ok');\n",
    });

    const result = await inspectReactProject({ rootDirectory });

    expect(result.project.hasReactCompiler).toBe(true);
  });

  it("honors options.config.rootDir even when no react-doctor.config.json exists", async () => {
    const rootDirectory = await createFixtureProject({
      "apps/web/package.json": JSON.stringify({
        name: "web",
        dependencies: { react: "^19.0.0" },
      }),
      "apps/web/src/main.tsx": "import { App } from './app';\nconsole.log(App);\n",
      "apps/web/src/app.tsx": "export const App = () => null;\n",
    });

    const result = await inspectReactProject({
      rootDirectory,
      config: { rootDir: "apps/web" },
    });

    expect(result.project.rootDirectory).toBe(path.join(rootDirectory, "apps/web"));
    expect(result.project.projectName).toBe("web");
  });

  it("prefers options.config.rootDir over a disk config that targets a different directory", async () => {
    const rootDirectory = await createFixtureProject({
      "react-doctor.config.json": JSON.stringify({ rootDir: "apps/api" }),
      "apps/api/package.json": JSON.stringify({ name: "api" }),
      "apps/api/src/main.ts": "console.log('api');\n",
      "apps/web/package.json": JSON.stringify({
        name: "web",
        dependencies: { react: "^19.0.0" },
      }),
      "apps/web/src/main.tsx": "import { App } from './app';\nconsole.log(App);\n",
      "apps/web/src/app.tsx": "export const App = () => null;\n",
    });

    const result = await inspectReactProject({
      rootDirectory,
      config: { rootDir: "apps/web" },
    });

    expect(result.project.rootDirectory).toBe(path.join(rootDirectory, "apps/web"));
    expect(result.project.projectName).toBe("web");
  });

  it("detects React Compiler from ancestor package manifests", async () => {
    const rootDirectory = await createFixtureProject({
      "package.json": JSON.stringify({
        name: "workspace",
        devDependencies: { "babel-plugin-react-compiler": "^1.0.0" },
        workspaces: ["apps/*"],
      }),
      "apps/web/package.json": JSON.stringify({
        name: "web",
        dependencies: { react: "^19.0.0" },
      }),
      "apps/web/src/main.tsx": "console.log('ok');\n",
    });

    const result = await inspectReactProject({
      rootDirectory: path.join(rootDirectory, "apps/web"),
    });

    expect(result.project.hasReactCompiler).toBe(true);
  });
});

describe("createReactDoctor", () => {
  it("creates a reusable advanced SDK client with default options", async () => {
    const reactDoctor = createReactDoctor({ rootDirectory: "src" });
    const result = await reactDoctor.inspect();

    expect(result.project.rootDirectory).toBe(path.resolve("src"));
  });
});
