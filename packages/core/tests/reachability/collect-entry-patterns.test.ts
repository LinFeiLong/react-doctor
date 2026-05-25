import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vite-plus/test";
import type { ProjectInfo } from "@react-doctor/core";
import { collectReachabilityEntryPatterns } from "../../src/reachability/collect-entry-patterns.js";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rd-reachability-entry-patterns-"));

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

const expoProject = (rootDirectory: string): ProjectInfo => ({
  rootDirectory,
  projectName: "expo-app",
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

const setupProject = (caseId: string, files: Record<string, string>): string => {
  const projectDirectory = path.join(tempRoot, caseId);
  fs.mkdirSync(projectDirectory, { recursive: true });
  for (const [relativePath, contents] of Object.entries(files)) {
    const fullPath = path.join(projectDirectory, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, contents);
  }
  return projectDirectory;
};

describe("collectReachabilityEntryPatterns", () => {
  it("collects local Expo config plugins without treating package names as files", () => {
    const directory = setupProject("expo-plugin-paths", {
      "app.config.ts": `export default {
  plugins: [
    "./plugins/with-secure-flag.plugin.ts",
    ["./plugins/with-day-night-theme", { enabled: true }],
    "./plugins/with-directory-plugin",
    "expo-camera",
  ],
};
`,
      "plugins/with-secure-flag.plugin.ts": "export default (config: unknown) => config;\n",
      "plugins/with-day-night-theme.ts": "export default (config: unknown) => config;\n",
      "plugins/with-directory-plugin/index.ts": "export default (config: unknown) => config;\n",
      "expo-camera.ts": "export const packageNameLookalike = true;\n",
    });

    expect(
      collectReachabilityEntryPatterns({
        rootDirectory: directory,
        project: expoProject(directory),
      }),
    ).toEqual([
      "plugins/with-secure-flag.plugin.ts",
      "plugins/with-day-night-theme.ts",
      "plugins/with-directory-plugin/index.ts",
    ]);
  });

  it("skips Expo config plugin discovery outside Expo or React Native projects", () => {
    const directory = setupProject("vite-plugin-paths", {
      "app.config.ts": `export default { plugins: ["./plugins/with-plugin.ts"] };\n`,
      "plugins/with-plugin.ts": "export default (config: unknown) => config;\n",
    });

    expect(
      collectReachabilityEntryPatterns({
        rootDirectory: directory,
        project: {
          ...expoProject(directory),
          framework: "vite",
          hasReactNativeWorkspace: false,
        },
      }),
    ).toEqual([]);
    expect(collectReachabilityEntryPatterns({ rootDirectory: directory })).toEqual([]);
  });
});
