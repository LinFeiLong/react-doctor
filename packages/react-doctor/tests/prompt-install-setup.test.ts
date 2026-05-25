import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { SETUP_PROMPT_DELAY_MS } from "../src/cli/utils/constants.js";
import {
  buildInstallSetupPitchLines,
  disableSetupPrompt,
  getSetupPromptConfigPath,
  getSetupPromptProjectKey,
  hasDisabledSetupPrompt,
  promptInstallSetup,
  SETUP_PROMPT_CHOICE_NEVER,
  SETUP_PROMPT_CHOICE_NO,
  SETUP_PROMPT_CHOICE_YES,
  shouldPromptInstallSetup,
} from "../src/cli/utils/prompt-install-setup.js";

interface PromptInstallSetupFixture {
  readonly configRoot: string;
  readonly projectRoot: string;
  readonly cleanup: () => void;
}

const setupFixture = (): PromptInstallSetupFixture => {
  const root = mkdtempSync(path.join(tmpdir(), "react-doctor-prompt-install-setup-"));
  const configRoot = path.join(root, "config");
  const projectRoot = path.join(root, "project");
  mkdirSync(projectRoot, { recursive: true });
  return {
    configRoot,
    projectRoot,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
};

const writePackageJson = (projectRoot: string, value: Record<string, unknown>): void => {
  writeFileSync(path.join(projectRoot, "package.json"), `${JSON.stringify(value, null, 2)}\n`);
};

const readPackageJson = (projectRoot: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"));

const readSetupPromptConfig = (configRoot: string): Record<string, unknown> =>
  JSON.parse(readFileSync(getSetupPromptConfigPath({ cwd: configRoot }), "utf8"));

describe("shouldPromptInstallSetup", () => {
  let fixture: PromptInstallSetupFixture;

  beforeEach(() => {
    fixture = setupFixture();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  it("prompts after a scored interactive scan when the doctor script is missing", () => {
    writePackageJson(fixture.projectRoot, {
      scripts: {
        test: "vite-plus test",
      },
    });

    expect(
      shouldPromptInstallSetup({
        projectRoot: fixture.projectRoot,
        hasScoredScan: true,
        isJsonMode: false,
        isScoreOnly: false,
        isStaged: false,
        skipPrompts: false,
        store: { cwd: fixture.configRoot },
      }),
    ).toBe(true);
  });

  it("skips when the doctor script already exists", () => {
    writePackageJson(fixture.projectRoot, {
      scripts: {
        doctor: "react-doctor",
      },
    });

    expect(
      shouldPromptInstallSetup({
        projectRoot: fixture.projectRoot,
        hasScoredScan: true,
        isJsonMode: false,
        isScoreOnly: false,
        isStaged: false,
        skipPrompts: false,
        store: { cwd: fixture.configRoot },
      }),
    ).toBe(false);
  });

  it("skips when setup prompt has been disabled for this project", () => {
    writePackageJson(fixture.projectRoot, { scripts: {} });
    disableSetupPrompt(fixture.projectRoot, { cwd: fixture.configRoot });

    expect(
      shouldPromptInstallSetup({
        projectRoot: fixture.projectRoot,
        hasScoredScan: true,
        isJsonMode: false,
        isScoreOnly: false,
        isStaged: false,
        skipPrompts: false,
        store: { cwd: fixture.configRoot },
      }),
    ).toBe(false);
  });

  it("skips quiet and non-interactive scan modes", () => {
    writePackageJson(fixture.projectRoot, { scripts: {} });
    const baseOptions = {
      projectRoot: fixture.projectRoot,
      hasScoredScan: true,
      isJsonMode: false,
      isScoreOnly: false,
      isStaged: false,
      skipPrompts: false,
      store: { cwd: fixture.configRoot },
    };

    expect(shouldPromptInstallSetup({ ...baseOptions, isJsonMode: true })).toBe(false);
    expect(shouldPromptInstallSetup({ ...baseOptions, isScoreOnly: true })).toBe(false);
    expect(shouldPromptInstallSetup({ ...baseOptions, isStaged: true })).toBe(false);
    expect(shouldPromptInstallSetup({ ...baseOptions, skipPrompts: true })).toBe(false);
    expect(shouldPromptInstallSetup({ ...baseOptions, hasScoredScan: false })).toBe(false);
  });

  it("waits after score output, prints a setup pitch, then installs when accepted", async () => {
    writePackageJson(fixture.projectRoot, { scripts: {} });
    const writtenLines: string[] = [];
    let waitedMilliseconds = 0;
    let selectMessage = "";
    let didInstall = false;

    await promptInstallSetup({
      projectRoot: fixture.projectRoot,
      hasScoredScan: true,
      issueCount: 2,
      isJsonMode: false,
      isScoreOnly: false,
      isStaged: false,
      skipPrompts: false,
      store: { cwd: fixture.configRoot },
      wait: async (milliseconds) => {
        waitedMilliseconds = milliseconds;
      },
      writeLine: (line = "") => {
        writtenLines.push(line);
      },
      select: async (message) => {
        selectMessage = message;
        return SETUP_PROMPT_CHOICE_YES;
      },
      install: async () => {
        didInstall = true;
      },
    });

    expect(waitedMilliseconds).toBe(SETUP_PROMPT_DELAY_MS);
    expect(writtenLines.join("\n")).toContain("2 issues");
    expect(writtenLines.join("\n")).toContain("humans and agents");
    expect(writtenLines.join("\n")).toContain("`doctor` package script");
    expect(writtenLines.join("\n")).toContain("skills for your coding agents");
    expect(writtenLines.join("\n")).toContain("optional hooks");
    expect(selectMessage).toBe("Set up React Doctor for this project?");
    expect(didInstall).toBe(true);
  });

  it("does not install when the user chooses no", async () => {
    writePackageJson(fixture.projectRoot, { scripts: {} });
    let didInstall = false;

    await promptInstallSetup({
      projectRoot: fixture.projectRoot,
      hasScoredScan: true,
      issueCount: 1,
      isJsonMode: false,
      isScoreOnly: false,
      isStaged: false,
      skipPrompts: false,
      store: { cwd: fixture.configRoot },
      wait: async () => {},
      writeLine: () => {},
      select: async () => SETUP_PROMPT_CHOICE_NO,
      install: async () => {
        didInstall = true;
      },
    });

    expect(didInstall).toBe(false);
    expect(hasDisabledSetupPrompt(fixture.projectRoot, { cwd: fixture.configRoot })).toBe(false);
  });

  it("persists never ask again in the global config store without installing", async () => {
    writePackageJson(fixture.projectRoot, {
      reactDoctor: {
        share: false,
      },
      scripts: {},
    });
    let didInstall = false;

    await promptInstallSetup({
      projectRoot: fixture.projectRoot,
      hasScoredScan: true,
      issueCount: 1,
      isJsonMode: false,
      isScoreOnly: false,
      isStaged: false,
      skipPrompts: false,
      store: { cwd: fixture.configRoot },
      wait: async () => {},
      writeLine: () => {},
      select: async () => SETUP_PROMPT_CHOICE_NEVER,
      install: async () => {
        didInstall = true;
      },
    });

    expect(didInstall).toBe(false);
    expect(readPackageJson(fixture.projectRoot).reactDoctor).toEqual({
      share: false,
    });
    const projectKey = getSetupPromptProjectKey(fixture.projectRoot);
    expect(readSetupPromptConfig(fixture.configRoot).projects).toEqual({
      [projectKey]: {
        rootDirectory: path.resolve(fixture.projectRoot),
        setupPrompt: false,
      },
    });
    expect(hasDisabledSetupPrompt(fixture.projectRoot, { cwd: fixture.configRoot })).toBe(true);
  });

  it("preserves existing global config values when disabling", () => {
    writePackageJson(fixture.projectRoot, { scripts: {} });
    const otherProjectKey = getSetupPromptProjectKey("/other/project");
    writeFileSync(
      getSetupPromptConfigPath({ cwd: fixture.configRoot }),
      `${JSON.stringify(
        {
          projects: {
            [otherProjectKey]: {
              rootDirectory: "/other/project",
              setupPrompt: false,
            },
          },
        },
        null,
        2,
      )}\n`,
    );

    expect(disableSetupPrompt(fixture.projectRoot, { cwd: fixture.configRoot })).toBe(true);
    const projectKey = getSetupPromptProjectKey(fixture.projectRoot);
    expect(readSetupPromptConfig(fixture.configRoot).projects).toEqual({
      [otherProjectKey]: {
        rootDirectory: "/other/project",
        setupPrompt: false,
      },
      [projectKey]: {
        rootDirectory: path.resolve(fixture.projectRoot),
        setupPrompt: false,
      },
    });
  });

  it("does not write the package.json when disabling directly", () => {
    writePackageJson(fixture.projectRoot, {
      reactDoctor: {
        share: false,
      },
      scripts: {},
    });

    expect(disableSetupPrompt(fixture.projectRoot, { cwd: fixture.configRoot })).toBe(true);
    expect(readPackageJson(fixture.projectRoot).reactDoctor).toEqual({
      share: false,
    });
    expect(hasDisabledSetupPrompt(fixture.projectRoot, { cwd: fixture.configRoot })).toBe(true);
  });

  it("can disable setup prompt directly", () => {
    writePackageJson(fixture.projectRoot, { scripts: {} });

    expect(disableSetupPrompt(fixture.projectRoot, { cwd: fixture.configRoot })).toBe(true);
    expect(hasDisabledSetupPrompt(fixture.projectRoot, { cwd: fixture.configRoot })).toBe(true);
  });

  it("pitches future regression checks when no issues were found", () => {
    expect(buildInstallSetupPitchLines(0).join("\n")).toContain(
      "catch future regressions early",
    );
  });
});
