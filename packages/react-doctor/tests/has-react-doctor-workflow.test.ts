import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { hasReactDoctorWorkflow } from "../src/cli/utils/has-react-doctor-workflow.js";

describe("hasReactDoctorWorkflow", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "rd-workflow-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const writeWorkflow = (directory: string, name: string, contents: string): void => {
    const workflows = path.join(directory, ".github", "workflows");
    mkdirSync(workflows, { recursive: true });
    writeFileSync(path.join(workflows, name), contents);
  };

  it("is false with no workflows", () => {
    writeFileSync(path.join(root, ".git"), "");
    expect(hasReactDoctorWorkflow(root)).toBe(false);
  });

  it("is false for a CI workflow that does not run react-doctor", () => {
    writeFileSync(path.join(root, ".git"), "");
    writeWorkflow(root, "ci.yml", "name: CI\njobs:\n  test:\n    steps:\n      - run: npm test\n");
    expect(hasReactDoctorWorkflow(root)).toBe(false);
  });

  it("detects a workflow using the react-doctor action", () => {
    writeWorkflow(
      root,
      "react-doctor.yml",
      "jobs:\n  scan:\n    steps:\n      - uses: millionco/react-doctor@main\n",
    );
    expect(hasReactDoctorWorkflow(root)).toBe(true);
  });

  it("detects an `npx react-doctor` step in any workflow file", () => {
    writeWorkflow(
      root,
      "quality.yml",
      "jobs:\n  q:\n    steps:\n      - run: npx react-doctor .\n",
    );
    expect(hasReactDoctorWorkflow(root)).toBe(true);
  });

  it("finds the workflow at the repo root above a nested package (uses the scan dir)", () => {
    writeWorkflow(root, "react-doctor.yml", "- uses: millionco/react-doctor@main\n");
    writeFileSync(path.join(root, ".git"), "");
    const packageDirectory = path.join(root, "packages", "app");
    mkdirSync(packageDirectory, { recursive: true });
    expect(hasReactDoctorWorkflow(packageDirectory)).toBe(true);
  });
});
