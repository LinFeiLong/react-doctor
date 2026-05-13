import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { getStagedSourceFiles, materializeStagedFiles } from "../src/cli/get-staged-files.js";

const createdFixtureDirectories: string[] = [];

const createGitFixture = async (): Promise<string> => {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "react-doctor-staged-test-"));
  createdFixtureDirectories.push(rootDirectory);
  spawnSync("git", ["init"], { cwd: rootDirectory, stdio: "ignore" });
  return rootDirectory;
};

const writeFile = async (
  rootDirectory: string,
  relativePath: string,
  sourceText: string,
): Promise<void> => {
  const filePath = path.join(rootDirectory, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, sourceText);
};

afterEach(async () => {
  while (createdFixtureDirectories.length > 0) {
    const fixtureDirectory = createdFixtureDirectories.pop();
    if (!fixtureDirectory) continue;
    await fs.rm(fixtureDirectory, { recursive: true, force: true });
  }
});

describe("staged file materialization", () => {
  it("copies nested package config from the index for staged monorepo files", async () => {
    const rootDirectory = await createGitFixture();
    await writeFile(rootDirectory, "README.md", "fixture\n");
    spawnSync("git", ["add", "README.md"], { cwd: rootDirectory, stdio: "ignore" });
    spawnSync(
      "git",
      [
        "-c",
        "user.name=React Doctor",
        "-c",
        "user.email=react-doctor@example.com",
        "commit",
        "-m",
        "Initial fixture",
      ],
      { cwd: rootDirectory, stdio: "ignore" },
    );
    await writeFile(
      rootDirectory,
      "apps/web/package.json",
      JSON.stringify({ name: "web", dependencies: { react: "^19.0.0" } }),
    );
    await writeFile(rootDirectory, "apps/web/src/app.tsx", "export const App = () => null;\n");
    spawnSync("git", ["add", "apps/web/package.json", "apps/web/src/app.tsx"], {
      cwd: rootDirectory,
      stdio: "ignore",
    });
    await writeFile(rootDirectory, "apps/web/package.json", JSON.stringify({ name: "web" }));

    const stagedFiles = getStagedSourceFiles(rootDirectory);
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "react-doctor-staged-copy-"));
    createdFixtureDirectories.push(tempDirectory);
    const snapshot = materializeStagedFiles(rootDirectory, stagedFiles, tempDirectory);

    const copiedPackageJson: unknown = JSON.parse(
      await fs.readFile(path.join(snapshot.tempDirectory, "apps/web/package.json"), "utf8"),
    );
    const dependencies =
      typeof copiedPackageJson === "object" && copiedPackageJson !== null
        ? Reflect.get(copiedPackageJson, "dependencies")
        : null;
    const reactDependency =
      typeof dependencies === "object" && dependencies !== null
        ? Reflect.get(dependencies, "react")
        : null;

    expect(stagedFiles).toEqual(["apps/web/src/app.tsx"]);
    expect(reactDependency).toBe("^19.0.0");
  });
});
