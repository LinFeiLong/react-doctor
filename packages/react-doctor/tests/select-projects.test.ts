import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { selectProjects } from "../src/cli/utils/select-projects.js";
import { prompts } from "../src/cli/utils/prompts.js";
import { setupReactProject, writeJson } from "./regressions/_helpers.js";

vi.mock("../src/cli/utils/prompts.js", () => ({
  prompts: vi.fn(),
}));

const tempDirectories: string[] = [];

const createTempDirectory = (): string => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "react-doctor-select-projects-"));
  tempDirectories.push(tempDirectory);
  return tempDirectory;
};

afterEach(() => {
  vi.clearAllMocks();
  for (const tempDirectory of tempDirectories.splice(0)) {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

describe("selectProjects", () => {
  it("skips project selection output for a non-monorepo React project", async () => {
    const tempDirectory = createTempDirectory();
    const projectDirectory = setupReactProject(tempDirectory, "app");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      const selectedDirectories = await selectProjects(projectDirectory, undefined, false);

      expect(selectedDirectories).toEqual([projectDirectory]);
      expect(prompts).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("keeps the selected project output for a monorepo with one React workspace", async () => {
    const tempDirectory = createTempDirectory();
    writeJson(path.join(tempDirectory, "package.json"), {
      name: "workspace",
      workspaces: ["apps/*"],
    });
    const projectDirectory = setupReactProject(path.join(tempDirectory, "apps"), "web");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      const selectedDirectories = await selectProjects(tempDirectory, undefined, false);

      expect(selectedDirectories).toEqual([projectDirectory]);
      expect(prompts).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Select projects to scan"));
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
