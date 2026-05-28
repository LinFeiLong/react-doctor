import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { hasLocalClaudeCodeAuth } from "../src/cli/utils/detect-claude-code-auth.js";

describe("hasLocalClaudeCodeAuth", () => {
  let temporaryHomeDirectory: string;

  beforeEach(() => {
    temporaryHomeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "rd-claude-auth-"));
  });

  afterEach(() => {
    fs.rmSync(temporaryHomeDirectory, { recursive: true, force: true });
  });

  it("returns false when no credentials directory exists", () => {
    expect(hasLocalClaudeCodeAuth(temporaryHomeDirectory)).toBe(false);
  });

  it("returns true when ~/.claude/.credentials.json is non-empty", () => {
    const credentialsDirectory = path.join(temporaryHomeDirectory, ".claude");
    fs.mkdirSync(credentialsDirectory, { recursive: true });
    fs.writeFileSync(path.join(credentialsDirectory, ".credentials.json"), `{"token":"x"}`);

    expect(hasLocalClaudeCodeAuth(temporaryHomeDirectory)).toBe(true);
  });

  it("returns true when ~/.config/claude/credentials.json is non-empty", () => {
    const credentialsDirectory = path.join(temporaryHomeDirectory, ".config", "claude");
    fs.mkdirSync(credentialsDirectory, { recursive: true });
    fs.writeFileSync(path.join(credentialsDirectory, "credentials.json"), `{"token":"x"}`);

    expect(hasLocalClaudeCodeAuth(temporaryHomeDirectory)).toBe(true);
  });

  it("returns false when the credentials file exists but is empty", () => {
    const credentialsDirectory = path.join(temporaryHomeDirectory, ".claude");
    fs.mkdirSync(credentialsDirectory, { recursive: true });
    fs.writeFileSync(path.join(credentialsDirectory, ".credentials.json"), "");

    expect(hasLocalClaudeCodeAuth(temporaryHomeDirectory)).toBe(false);
  });

  it("returns false when an empty home directory is provided", () => {
    expect(hasLocalClaudeCodeAuth("")).toBe(false);
  });
});
