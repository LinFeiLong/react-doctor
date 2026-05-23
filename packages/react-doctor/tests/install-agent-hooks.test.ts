import {
  constants as fsConstants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { installReactDoctorAgentHooks } from "../src/cli/utils/install-agent-hooks.js";

interface AgentHooksFixture {
  readonly projectRoot: string;
  readonly cleanup: () => void;
}

const setupFixture = (): AgentHooksFixture => {
  const root = mkdtempSync(path.join(tmpdir(), "react-doctor-agent-hooks-"));
  return {
    projectRoot: root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
};

const readJson = <Value>(filePath: string): Value => JSON.parse(readFileSync(filePath, "utf8"));

describe("installReactDoctorAgentHooks", () => {
  let fixture: AgentHooksFixture;

  beforeEach(() => {
    fixture = setupFixture();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  it("installs a Claude Code PostToolBatch hook without duplicating existing hooks", () => {
    const settingsPath = path.join(fixture.projectRoot, ".claude/settings.json");
    const hookPath = path.join(fixture.projectRoot, ".claude/hooks/react-doctor.sh");
    mkdirSync(path.dirname(settingsPath), { recursive: true });
    writeFileSync(
      settingsPath,
      JSON.stringify({
        permissions: { allow: ["Bash(git status)"] },
        hooks: {
          PostToolBatch: [
            {
              hooks: [{ type: "command", command: "echo existing" }],
            },
          ],
        },
      }),
    );

    const result = installReactDoctorAgentHooks({
      projectRoot: fixture.projectRoot,
      agents: ["claude-code"],
    });
    installReactDoctorAgentHooks({
      projectRoot: fixture.projectRoot,
      agents: ["claude-code"],
    });

    const settings = readJson<{
      permissions: { allow: string[] };
      hooks: { PostToolBatch: Array<{ hooks: Array<{ command: string }> }> };
    }>(settingsPath);
    const hookCommands = settings.hooks.PostToolBatch.flatMap((group) =>
      group.hooks.map((hook) => hook.command),
    );
    const hookContent = readFileSync(hookPath, "utf8");

    expect(result.installedAgents).toEqual(["claude-code"]);
    expect(result.files).toContain(settingsPath);
    expect(settings.permissions.allow).toEqual(["Bash(git status)"]);
    expect(hookCommands.filter((command) => command.includes("react-doctor.sh"))).toHaveLength(1);
    expect(hookContent).toContain("project_root=${CLAUDE_PROJECT_DIR:-}");
    expect(hookContent).toContain("react-doctor --verbose --diff");
    expect(Boolean(statSync(hookPath).mode & fsConstants.S_IXUSR)).toBe(true);
  });

  it("installs a Cursor postToolUse hook and preserves existing hook config", () => {
    const configPath = path.join(fixture.projectRoot, ".cursor/hooks.json");
    const hookPath = path.join(fixture.projectRoot, ".cursor/hooks/react-doctor.sh");
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(
      configPath,
      JSON.stringify({
        version: 1,
        hooks: {
          sessionStart: [{ command: ".cursor/hooks/bootstrap.sh" }],
        },
      }),
    );

    const result = installReactDoctorAgentHooks({
      projectRoot: fixture.projectRoot,
      agents: ["cursor"],
    });
    installReactDoctorAgentHooks({
      projectRoot: fixture.projectRoot,
      agents: ["cursor"],
    });

    const config = readJson<{
      version: number;
      hooks: {
        sessionStart: Array<{ command: string }>;
        postToolUse: Array<{ command: string; matcher: string; timeout: number }>;
      };
    }>(configPath);

    expect(result.installedAgents).toEqual(["cursor"]);
    const hookContent = readFileSync(hookPath, "utf8");
    expect(config.version).toBe(1);
    expect(config.hooks.sessionStart).toEqual([{ command: ".cursor/hooks/bootstrap.sh" }]);
    expect(config.hooks.postToolUse).toHaveLength(1);
    expect(config.hooks.postToolUse[0]).toEqual({
      command: ".cursor/hooks/react-doctor.sh",
      matcher: "Write|Edit|MultiEdit|ApplyPatch",
      timeout: 120,
    });
    expect(existsSync(hookPath)).toBe(true);
    expect(hookContent).toContain('project_root=$(CDPATH= cd "$script_dir/../.." && pwd)');
    expect(hookContent).toContain("additional_context");
    expect(Boolean(statSync(hookPath).mode & fsConstants.S_IXUSR)).toBe(true);
  });

  it("ignores agents without native hook support", () => {
    const result = installReactDoctorAgentHooks({
      projectRoot: fixture.projectRoot,
      agents: ["codex", "opencode"],
    });

    expect(result.installedAgents).toEqual([]);
    expect(result.files).toEqual([]);
    expect(existsSync(path.join(fixture.projectRoot, ".cursor/hooks.json"))).toBe(false);
    expect(existsSync(path.join(fixture.projectRoot, ".claude/settings.json"))).toBe(false);
  });
});
