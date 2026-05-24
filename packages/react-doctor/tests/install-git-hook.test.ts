import {
  chmodSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import {
  detectGitHookTarget,
  installReactDoctorGitHook,
} from "../src/cli/utils/install-git-hook.js";

interface GitHookFixture {
  readonly projectRoot: string;
  readonly hookPath: string;
  readonly runnerPath: string;
  readonly cleanup: () => void;
}

const setupFixture = (): GitHookFixture => {
  const root = mkdtempSync(path.join(tmpdir(), "react-doctor-git-hook-"));
  return {
    projectRoot: root,
    hookPath: path.join(root, ".git/hooks/pre-commit"),
    runnerPath: path.join(root, ".react-doctor/hooks/pre-commit"),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
};

const readHook = (hookPath: string): string => readFileSync(hookPath, "utf8");

describe("installReactDoctorGitHook", () => {
  let fixture: GitHookFixture;

  beforeEach(() => {
    fixture = setupFixture();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  it("creates a dependency-free non-blocking pre-commit hook", () => {
    const result = installReactDoctorGitHook({
      hookPath: fixture.hookPath,
      projectRoot: fixture.projectRoot,
    });
    const hookContent = readHook(fixture.hookPath);
    const runnerContent = readHook(fixture.runnerPath);

    expect(result.status).toBe("created");
    expect(result.runnerPath).toBe(fixture.runnerPath);
    expect(hookContent).toContain("#!/bin/sh");
    expect(hookContent).toContain(".react-doctor/hooks/pre-commit");
    expect(runnerContent).toContain("react-doctor --staged --fail-on none");
    expect(runnerContent).toContain("pnpm dlx react-doctor@latest --staged --fail-on none");
    expect(runnerContent).toContain("npx --yes react-doctor@latest --staged --fail-on none");
    expect(runnerContent).toContain("if ! react_doctor_scan_staged_files; then");
    expect(runnerContent).toContain("exit 0");
    expect(hookContent).not.toContain("husky");
    expect(existsSync(fixture.hookPath)).toBe(true);
    expect(existsSync(fixture.runnerPath)).toBe(true);
    expect(Boolean(statSync(fixture.hookPath).mode & fsConstants.S_IXUSR)).toBe(true);
    expect(Boolean(statSync(fixture.runnerPath).mode & fsConstants.S_IXUSR)).toBe(true);
  });

  it("does not detect a Git hook target outside a Git repository", () => {
    expect(detectGitHookTarget(fixture.projectRoot)).toBe(null);
  });

  it("preserves existing hook content", () => {
    mkdirSync(path.dirname(fixture.hookPath), { recursive: true });
    writeFileSync(fixture.hookPath, "#!/bin/sh\nnpm test\n");

    const result = installReactDoctorGitHook({
      hookPath: fixture.hookPath,
      projectRoot: fixture.projectRoot,
    });
    const hookContent = readHook(fixture.hookPath);

    expect(result.status).toBe("updated");
    expect(hookContent.startsWith("#!/bin/sh\n\n# react-doctor hook launcher start")).toBe(true);
    expect(hookContent).toContain("npm test\n");
  });

  it("updates the managed block instead of duplicating it", () => {
    installReactDoctorGitHook({ hookPath: fixture.hookPath, projectRoot: fixture.projectRoot });
    writeFileSync(fixture.runnerPath, "#!/bin/sh\nprintf stale-runner\n");
    installReactDoctorGitHook({ hookPath: fixture.hookPath, projectRoot: fixture.projectRoot });

    const hookContent = readHook(fixture.hookPath);
    const runnerContent = readHook(fixture.runnerPath);
    const managedBlockMatches = hookContent.match(/# react-doctor hook launcher start/g) ?? [];

    expect(managedBlockMatches).toHaveLength(1);
    expect(runnerContent).toContain("react-doctor --staged --fail-on none");
    expect(runnerContent).not.toContain("stale-runner");
  });

  it("detects the default hook path at the repository root when run from a subdirectory", () => {
    execFileSync("git", ["init"], { cwd: fixture.projectRoot, stdio: "ignore" });
    const packageDirectory = path.join(fixture.projectRoot, "packages/app");
    mkdirSync(packageDirectory, { recursive: true });
    const realProjectRoot = realpathSync(fixture.projectRoot);

    const target = detectGitHookTarget(packageDirectory);
    if (target === null) throw new Error("Expected git hook target");

    expect(realpathSync(path.dirname(target.hookPath))).toBe(
      path.join(realProjectRoot, ".git/hooks"),
    );
    expect(path.basename(target.hookPath)).toBe("pre-commit");
    expect(target.runnerRoot).toBe(realProjectRoot);
  });

  it("detects a configured hooks directory from a subdirectory", () => {
    execFileSync("git", ["init"], { cwd: fixture.projectRoot, stdio: "ignore" });
    execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
      cwd: fixture.projectRoot,
    });
    const packageDirectory = path.join(fixture.projectRoot, "packages/app");
    mkdirSync(packageDirectory, { recursive: true });
    const realProjectRoot = realpathSync(fixture.projectRoot);

    const target = detectGitHookTarget(packageDirectory);

    expect(target).toEqual({
      hookPath: path.join(realProjectRoot, ".githooks/pre-commit"),
      runnerRoot: realProjectRoot,
    });
  });

  it("detects an absolute configured hooks directory", () => {
    execFileSync("git", ["init"], { cwd: fixture.projectRoot, stdio: "ignore" });
    const hooksDirectory = path.join(fixture.projectRoot, "absolute-hooks");
    execFileSync("git", ["config", "core.hooksPath", hooksDirectory], {
      cwd: fixture.projectRoot,
    });
    const packageDirectory = path.join(fixture.projectRoot, "packages/app");
    mkdirSync(packageDirectory, { recursive: true });
    const realProjectRoot = realpathSync(fixture.projectRoot);

    const target = detectGitHookTarget(packageDirectory);

    expect(target).toEqual({
      hookPath: path.join(hooksDirectory, "pre-commit"),
      runnerRoot: realProjectRoot,
    });
  });

  it("runs through a configured hooks directory during a real git commit", () => {
    execFileSync("git", ["init"], { cwd: fixture.projectRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "doctor@example.com"], {
      cwd: fixture.projectRoot,
    });
    execFileSync("git", ["config", "user.name", "React Doctor"], { cwd: fixture.projectRoot });
    execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: fixture.projectRoot });
    execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
      cwd: fixture.projectRoot,
    });
    const packageDirectory = path.join(fixture.projectRoot, "packages/app");
    mkdirSync(packageDirectory, { recursive: true });
    const target = detectGitHookTarget(packageDirectory);
    if (target === null) throw new Error("Expected git hook target");

    installReactDoctorGitHook({
      hookPath: target.hookPath,
      projectRoot: target.runnerRoot,
    });

    const localBinaryPath = path.join(fixture.projectRoot, "node_modules/.bin/react-doctor");
    const invocationPath = path.join(fixture.projectRoot, ".react-doctor/hook-invocation.txt");
    mkdirSync(path.dirname(localBinaryPath), { recursive: true });
    writeFileSync(
      localBinaryPath,
      ["#!/bin/sh", "printf '%s\\n' \"$@\" > .react-doctor/hook-invocation.txt", "exit 0", ""].join(
        "\n",
      ),
    );
    chmodSync(localBinaryPath, fsConstants.S_IRWXU);

    writeFileSync(path.join(packageDirectory, "app.tsx"), "export const App = () => null;\n");
    execFileSync("git", ["add", "packages/app/app.tsx"], { cwd: fixture.projectRoot });
    execFileSync("git", ["commit", "-m", "test configured hook"], {
      cwd: packageDirectory,
      encoding: "utf8",
    });

    expect(target.hookPath).toBe(
      path.join(realpathSync(fixture.projectRoot), ".githooks/pre-commit"),
    );
    expect(readFileSync(invocationPath, "utf8")).toBe("--staged\n--fail-on\nnone\n");
  });

  it("runs the managed pre-commit runner during a real git commit", () => {
    execFileSync("git", ["init"], { cwd: fixture.projectRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "doctor@example.com"], {
      cwd: fixture.projectRoot,
    });
    execFileSync("git", ["config", "user.name", "React Doctor"], { cwd: fixture.projectRoot });
    execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: fixture.projectRoot });

    const packageDirectory = path.join(fixture.projectRoot, "packages/app");
    mkdirSync(packageDirectory, { recursive: true });
    const target = detectGitHookTarget(packageDirectory);
    if (target === null) throw new Error("Expected git hook target");

    installReactDoctorGitHook({
      hookPath: target.hookPath,
      projectRoot: target.runnerRoot,
    });

    const localBinaryPath = path.join(fixture.projectRoot, "node_modules/.bin/react-doctor");
    const invocationPath = path.join(fixture.projectRoot, ".react-doctor/hook-invocation.txt");
    mkdirSync(path.dirname(localBinaryPath), { recursive: true });
    writeFileSync(
      localBinaryPath,
      ["#!/bin/sh", "printf '%s\\n' \"$@\" > .react-doctor/hook-invocation.txt", "exit 1", ""].join(
        "\n",
      ),
    );
    chmodSync(localBinaryPath, fsConstants.S_IRWXU);

    writeFileSync(path.join(packageDirectory, "app.tsx"), "export const App = () => null;\n");
    execFileSync("git", ["add", "packages/app/app.tsx"], { cwd: fixture.projectRoot });
    execFileSync("git", ["commit", "-m", "test hook"], {
      cwd: packageDirectory,
      encoding: "utf8",
    });

    expect(readFileSync(invocationPath, "utf8")).toBe("--staged\n--fail-on\nnone\n");
    expect(
      execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
        cwd: fixture.projectRoot,
        encoding: "utf8",
      }).trim(),
    ).toHaveLength(40);
  });

  it("preserves and executes existing hook content during a real git commit", () => {
    execFileSync("git", ["init"], { cwd: fixture.projectRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "doctor@example.com"], {
      cwd: fixture.projectRoot,
    });
    execFileSync("git", ["config", "user.name", "React Doctor"], { cwd: fixture.projectRoot });
    execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: fixture.projectRoot });
    mkdirSync(path.dirname(fixture.hookPath), { recursive: true });
    writeFileSync(
      fixture.hookPath,
      "#!/bin/sh\nprintf '%s\\n' existing-hook > existing-hook-ran.txt\n",
    );

    installReactDoctorGitHook({
      hookPath: fixture.hookPath,
      projectRoot: fixture.projectRoot,
    });

    const localBinaryPath = path.join(fixture.projectRoot, "node_modules/.bin/react-doctor");
    const invocationPath = path.join(fixture.projectRoot, ".react-doctor/hook-invocation.txt");
    mkdirSync(path.dirname(localBinaryPath), { recursive: true });
    writeFileSync(
      localBinaryPath,
      ["#!/bin/sh", "printf '%s\\n' \"$@\" > .react-doctor/hook-invocation.txt", "exit 0", ""].join(
        "\n",
      ),
    );
    chmodSync(localBinaryPath, fsConstants.S_IRWXU);

    writeFileSync(path.join(fixture.projectRoot, "app.tsx"), "export const App = () => null;\n");
    execFileSync("git", ["add", "app.tsx"], { cwd: fixture.projectRoot });
    execFileSync("git", ["commit", "-m", "test existing hook"], {
      cwd: fixture.projectRoot,
      encoding: "utf8",
    });

    expect(readFileSync(invocationPath, "utf8")).toBe("--staged\n--fail-on\nnone\n");
    expect(readFileSync(path.join(fixture.projectRoot, "existing-hook-ran.txt"), "utf8")).toBe(
      "existing-hook\n",
    );
  });
});
