import { statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

// Locations the bundled Claude Code CLI caches credentials after
// `claude /login` or `claude setup-token`. We check existence + non-empty
// size (not contents) so we don't accidentally read tokens off disk — the
// SDK reads them itself. Paths are POSIX-ish; Windows users authenticated
// via Claude Code share the same layout under the user profile thanks to
// `os.homedir()`.
const CLAUDE_CODE_AUTH_CANDIDATE_PATHS: ReadonlyArray<string> = [
  ".claude/.credentials.json",
  ".claude/credentials.json",
  ".config/claude/credentials.json",
];

const isNonEmptyFile = (filePath: string): boolean => {
  try {
    const fileStats = statSync(filePath);
    return fileStats.isFile() && fileStats.size > 0;
  } catch {
    return false;
  }
};

export const hasLocalClaudeCodeAuth = (homeDirectory: string = homedir()): boolean => {
  if (!homeDirectory) return false;
  return CLAUDE_CODE_AUTH_CANDIDATE_PATHS.some((relativePath) =>
    isNonEmptyFile(path.join(homeDirectory, relativePath)),
  );
};
