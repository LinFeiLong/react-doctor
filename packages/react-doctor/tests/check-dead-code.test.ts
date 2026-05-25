import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vite-plus/test";
import type { ProjectInfo } from "@react-doctor/core";
import { checkDeadCode } from "@react-doctor/core";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rd-check-dead-code-"));

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

const setupProject = (caseId: string, files: Record<string, string>): string => {
  const projectDirectory = path.join(tempRoot, caseId);
  fs.mkdirSync(projectDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(projectDirectory, "package.json"),
    JSON.stringify({
      name: caseId,
      type: "module",
      dependencies: { react: "^19.0.0" },
    }),
  );
  fs.writeFileSync(
    path.join(projectDirectory, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { jsx: "preserve", target: "es2022", module: "esnext" } }),
  );
  for (const [relativePath, contents] of Object.entries(files)) {
    const fullPath = path.join(projectDirectory, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, contents);
  }
  return projectDirectory;
};

const expoProject = (rootDirectory: string, projectName: string): ProjectInfo => ({
  rootDirectory,
  projectName,
  reactVersion: "19.0.0",
  reactMajorVersion: 19,
  tailwindVersion: null,
  framework: "expo",
  hasTypeScript: true,
  hasReactCompiler: false,
  hasTanStackQuery: false,
  hasReactNativeWorkspace: true,
  sourceFileCount: 1,
});

describe("checkDeadCode", () => {
  it("returns no diagnostics when the directory has no package.json", async () => {
    const directory = path.join(tempRoot, "no-package-json");
    fs.mkdirSync(directory, { recursive: true });
    expect(await checkDeadCode({ rootDirectory: directory })).toEqual([]);
  });

  it("flags an orphan file with POSIX-separated paths under the Dead Code category", async () => {
    const directory = setupProject("unused-file", {
      "src/index.ts": "export const used = 1;\n",
      "src/orphan.ts": "export const orphan = 1;\n",
    });
    const diagnostics = await checkDeadCode({ rootDirectory: directory });
    const orphan = diagnostics.find(
      (diagnostic) =>
        diagnostic.rule === "unused-file" && diagnostic.filePath.endsWith("orphan.ts"),
    );
    expect(orphan).toBeDefined();
    expect(orphan?.plugin).toBe("deslop");
    expect(orphan?.category).toBe("Dead Code");
    expect(orphan?.filePath.includes("\\")).toBe(false);
  });

  it("honors ignore patterns from .gitignore and userConfig.ignore.files", async () => {
    const directory = setupProject("ignore-patterns", {
      "src/index.ts": "export const used = 1;\n",
      "src/gitignored.ts": "export const a = 1;\n",
      "src/configignored.ts": "export const b = 1;\n",
      ".gitignore": "src/gitignored.ts\n",
    });
    const diagnostics = await checkDeadCode({
      rootDirectory: directory,
      userConfig: { ignore: { files: ["src/configignored.ts"] } },
    });
    const flagged = diagnostics
      .filter((diagnostic) => diagnostic.rule === "unused-file")
      .map((diagnostic) => diagnostic.filePath);
    expect(flagged.some((entry) => entry.endsWith("gitignored.ts"))).toBe(false);
    expect(flagged.some((entry) => entry.endsWith("configignored.ts"))).toBe(false);
  });

  it("treats local Expo config plugins in app.config.ts as entry points", async () => {
    const directory = setupProject("expo-app-config-plugins", {
      "package.json": JSON.stringify({
        name: "expo-app-config-plugins",
        type: "module",
        dependencies: { expo: "^56.0.0", react: "^19.0.0" },
      }),
      "app.config.ts": `export default () => ({
  plugins: [
    "./plugins/android-secure-flag.plugin.ts",
    ["./plugins/android-day-night-theme", { enabled: true }],
    "expo-camera",
  ],
});
`,
      "plugins/android-secure-flag.plugin.ts": `export default function withAndroidSecureFlag(config: unknown): unknown {
  return config;
}
`,
      "plugins/android-day-night-theme.ts": `export default function withAndroidDayNightTheme(config: unknown): unknown {
  return config;
}
`,
      "plugins/orphan.ts": "export const orphan = 1;\n",
      "src/index.ts": "export const app = 1;\n",
    });

    const diagnostics = await checkDeadCode({
      rootDirectory: directory,
      project: expoProject(directory, "expo-app-config-plugins"),
    });
    const unusedFiles = diagnostics
      .filter((diagnostic) => diagnostic.rule === "unused-file")
      .map((diagnostic) => diagnostic.filePath);

    expect(unusedFiles.some((entry) => entry.endsWith("android-secure-flag.plugin.ts"))).toBe(false);
    expect(unusedFiles.some((entry) => entry.endsWith("android-day-night-theme.ts"))).toBe(false);
    expect(unusedFiles.some((entry) => entry.endsWith("orphan.ts"))).toBe(true);
  });

  it("treats local Expo config plugins in app.json as entry points", async () => {
    const directory = setupProject("expo-app-json-plugins", {
      "package.json": JSON.stringify({
        name: "expo-app-json-plugins",
        type: "module",
        dependencies: { expo: "^56.0.0", react: "^19.0.0" },
      }),
      "app.json": JSON.stringify({
        expo: {
          plugins: [["./plugins/with-json-plugin.ts", { enabled: true }], "expo-router"],
        },
      }),
      "plugins/with-json-plugin.ts": `export default function withJsonPlugin(config: unknown): unknown {
  return config;
}
`,
      "plugins/orphan.ts": "export const orphan = 1;\n",
      "src/index.ts": "export const app = 1;\n",
    });

    const diagnostics = await checkDeadCode({
      rootDirectory: directory,
      project: expoProject(directory, "expo-app-json-plugins"),
    });
    const unusedFiles = diagnostics
      .filter((diagnostic) => diagnostic.rule === "unused-file")
      .map((diagnostic) => diagnostic.filePath);

    expect(unusedFiles.some((entry) => entry.endsWith("with-json-plugin.ts"))).toBe(false);
    expect(unusedFiles.some((entry) => entry.endsWith("orphan.ts"))).toBe(true);
  });
});
