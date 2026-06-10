import { describe, expect, it } from "vite-plus/test";
import { detectDefaultBranch } from "../src/cli/utils/detect-default-branch.js";
import type { CommandRunner, RunCommandResult } from "../src/cli/utils/run-command.js";

const succeed = (stdout: string): RunCommandResult => ({
  success: true,
  stdout,
  stderr: "",
});

const fail = (): RunCommandResult => ({
  success: false,
  stdout: "",
  stderr: "",
});

// Fake runner keyed on "command arg1 arg2 …" so each test declares exactly
// which probes resolve; everything unlisted fails like a missing binary or
// a non-zero git exit would.
const fakeRunner = (responses: Record<string, RunCommandResult>): CommandRunner => {
  return (command, args) => {
    const invocation = [command, ...args].join(" ");
    return Promise.resolve(responses[invocation] ?? fail());
  };
};

const GH_REPO_VIEW = "gh repo view --json defaultBranchRef --jq .defaultBranchRef.name";
const GIT_ORIGIN_HEAD = "git symbolic-ref refs/remotes/origin/HEAD";
const GIT_VERIFY_MAIN = "git rev-parse --verify origin/main";
const GIT_VERIFY_MASTER = "git rev-parse --verify origin/master";

describe("detectDefaultBranch", () => {
  it("prefers GitHub's answer over a stale local origin/HEAD", async () => {
    const run = fakeRunner({
      [GH_REPO_VIEW]: succeed("develop"),
      [GIT_ORIGIN_HEAD]: succeed("refs/remotes/origin/main"),
      [GIT_VERIFY_MAIN]: succeed(""),
    });
    expect(await detectDefaultBranch("/repo", run)).toBe("develop");
  });

  it("falls back to origin/HEAD when gh is unavailable or fails", async () => {
    const run = fakeRunner({
      [GIT_ORIGIN_HEAD]: succeed("refs/remotes/origin/trunk"),
      [GIT_VERIFY_MAIN]: succeed(""),
    });
    expect(await detectDefaultBranch("/repo", run)).toBe("trunk");
  });

  it("treats gh's literal null (empty repo) as no answer", async () => {
    const run = fakeRunner({
      [GH_REPO_VIEW]: succeed("null"),
      [GIT_ORIGIN_HEAD]: succeed("refs/remotes/origin/develop"),
    });
    expect(await detectDefaultBranch("/repo", run)).toBe("develop");
  });

  it("guesses origin/main, then origin/master, when no signal exists", async () => {
    expect(await detectDefaultBranch("/repo", fakeRunner({ [GIT_VERIFY_MAIN]: succeed("") }))).toBe(
      "main",
    );
    expect(
      await detectDefaultBranch("/repo", fakeRunner({ [GIT_VERIFY_MASTER]: succeed("") })),
    ).toBe("master");
  });

  it("returns null when nothing resolves a branch", async () => {
    expect(await detectDefaultBranch("/repo", fakeRunner({}))).toBeNull();
  });
});
