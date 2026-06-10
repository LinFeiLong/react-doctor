import { runCommand, type CommandRunner } from "./run-command.js";

// Resolves the repository's default branch (the branch GitHub PRs merge
// against) — never assumes `main`. Sources, most authoritative first:
//
// 1. `gh repo view` — GitHub's own answer. Catches repos whose local
//    `origin/HEAD` is missing or stale (e.g. `git init` + `git remote add`
//    never sets it, and a default-branch rename on GitHub doesn't update it).
//    Skipped silently when `gh` is missing (the spawn fails), the user isn't
//    authenticated, the remote isn't GitHub, or the machine is offline.
// 2. `refs/remotes/origin/HEAD` — set when the repo was cloned or
//    `git remote set-head` ran.
// 3. Conventional `origin/main` / `origin/master` guesses, so older setups
//    without either signal still work.
export const detectDefaultBranch = async (
  cwd: string,
  run: CommandRunner = runCommand,
): Promise<string | null> => {
  const repoView = await run(
    "gh",
    ["repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"],
    cwd,
  );
  // An empty repo has `defaultBranchRef: null`, which the jq filter prints
  // as the literal string "null".
  if (repoView.success && repoView.stdout !== "" && repoView.stdout !== "null") {
    return repoView.stdout;
  }

  const symRef = await run("git", ["symbolic-ref", "refs/remotes/origin/HEAD"], cwd);
  if (symRef.success) {
    const branchMatch = symRef.stdout.match(/refs\/remotes\/origin\/(.+)$/);
    if (branchMatch) return branchMatch[1];
  }

  if ((await run("git", ["rev-parse", "--verify", "origin/main"], cwd)).success) return "main";
  if ((await run("git", ["rev-parse", "--verify", "origin/master"], cwd)).success) return "master";
  return null;
};
