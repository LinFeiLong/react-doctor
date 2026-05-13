import { describe, expect, it } from "vite-plus/test";
import { filterReactDoctorIssues } from "../src/sdk/index.js";
import type { ReactDoctorIssue } from "../src/sdk/index.js";

const createRawTextIssue = (line: number): ReactDoctorIssue => ({
  id: `react-doctor/rn-no-raw-text/${line}`,
  title: "Raw text",
  message: "Raw text outside a <Text> component",
  severity: "error",
  category: "oxlint",
  location: { filePath: "src/component.tsx", line },
  source: {
    checkId: "react-doctor/oxlint",
    pluginName: "react-doctor",
    ruleId: "rn-no-raw-text",
  },
});

const createIssue = (ruleId: string, line: number): ReactDoctorIssue => ({
  id: `react-doctor/${ruleId}/${line}`,
  title: ruleId,
  message: `${ruleId} fired`,
  severity: "warning",
  category: "oxlint",
  location: { filePath: "src/component.tsx", line },
  source: {
    checkId: "react-doctor/oxlint",
    pluginName: "react-doctor",
    ruleId,
  },
});

describe("diagnostics", () => {
  it("suppresses configured React Native raw text components", () => {
    const issues = filterReactDoctorIssues(
      [createRawTextIssue(1)],
      { textComponents: ["Trans"] },
      "/repo",
      () => ["<Trans>Hello</Trans>"],
    );

    expect(issues).toEqual([]);
  });

  it("suppresses configured raw text wrappers only for string-only children", () => {
    const suppressedIssues = filterReactDoctorIssues(
      [createRawTextIssue(1)],
      { rawTextWrapperComponents: ["Button"] },
      "/repo",
      () => ["<Button>Cancel</Button>"],
    );
    const mixedIssues = filterReactDoctorIssues(
      [createRawTextIssue(1)],
      { rawTextWrapperComponents: ["Button"] },
      "/repo",
      () => ["<Button>Save <Icon /></Button>"],
    );

    expect(suppressedIssues).toEqual([]);
    expect(mixedIssues).toHaveLength(1);
  });
});

describe("inline disable comments", () => {
  it("only suppresses the named rule when the comment uses the namespaced form", () => {
    const issues = filterReactDoctorIssues(
      [createIssue("no-fetch-in-effect", 2), createIssue("no-array-index-as-key", 2)],
      {},
      "/repo",
      () => ["// react-doctor-disable-next-line react-doctor/no-fetch-in-effect", "foo();"],
    );

    expect(issues.map((issue) => issue.source?.ruleId)).toEqual(["no-array-index-as-key"]);
  });

  it("only suppresses the named rule when the comment omits the namespace prefix", () => {
    const issues = filterReactDoctorIssues(
      [createIssue("no-fetch-in-effect", 2), createIssue("no-array-index-as-key", 2)],
      {},
      "/repo",
      () => ["// react-doctor-disable-next-line no-fetch-in-effect", "foo();"],
    );

    expect(issues.map((issue) => issue.source?.ruleId)).toEqual(["no-array-index-as-key"]);
  });

  it("treats a bare directive without rule names as a blanket disable", () => {
    const issues = filterReactDoctorIssues(
      [createIssue("no-fetch-in-effect", 2), createIssue("no-array-index-as-key", 2)],
      {},
      "/repo",
      () => ["// react-doctor-disable-next-line", "foo();"],
    );

    expect(issues).toEqual([]);
  });

  it("honors stacked disable-next-line comments above the diagnostic", () => {
    const issues = filterReactDoctorIssues(
      [createIssue("no-fetch-in-effect", 3), createIssue("no-array-index-as-key", 3)],
      {},
      "/repo",
      () => [
        "// react-doctor-disable-next-line no-fetch-in-effect",
        "// react-doctor-disable-next-line no-array-index-as-key",
        "foo();",
      ],
    );

    expect(issues).toEqual([]);
  });

  it("supports comma-separated rule names on a single directive", () => {
    const issues = filterReactDoctorIssues(
      [createIssue("no-fetch-in-effect", 2), createIssue("no-array-index-as-key", 2)],
      {},
      "/repo",
      () => [
        "// react-doctor-disable-next-line no-fetch-in-effect, no-array-index-as-key",
        "foo();",
      ],
    );

    expect(issues).toEqual([]);
  });

  it("ignores a stacked chain when a non-directive line sits between it and the diagnostic", () => {
    const issues = filterReactDoctorIssues(
      [createIssue("no-fetch-in-effect", 4)],
      {},
      "/repo",
      () => [
        "// react-doctor-disable-next-line no-fetch-in-effect",
        "const helper = 1;",
        "",
        "foo();",
      ],
    );

    expect(issues).toHaveLength(1);
  });

  it("suppresses the matching rule on the same line via react-doctor-disable-line", () => {
    const issues = filterReactDoctorIssues(
      [createIssue("no-fetch-in-effect", 1), createIssue("no-array-index-as-key", 1)],
      {},
      "/repo",
      () => ["foo(); // react-doctor-disable-line no-fetch-in-effect"],
    );

    expect(issues.map((issue) => issue.source?.ruleId)).toEqual(["no-array-index-as-key"]);
  });
});
