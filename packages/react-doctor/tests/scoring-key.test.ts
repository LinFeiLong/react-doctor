import { describe, expect, it } from "vite-plus/test";
import { getScoringPluginKey, getScoringRuleKey } from "../src/core/scoring-key.js";
import { tryScoreFromApi } from "../src/core/try-score-from-api.js";
import type { ReactDoctorIssue } from "../src/sdk/index.js";

const createIssue = (overrides: Partial<ReactDoctorIssue>): ReactDoctorIssue => ({
  id: "fallback-id",
  title: "Sample",
  message: "Sample message",
  severity: "warning",
  category: "codebase",
  ...overrides,
});

describe("scoring-key helpers", () => {
  it("collapses custom react-doctor checks onto their checkId", () => {
    const issue = createIssue({
      source: {
        checkId: "react-doctor/codebase/dead-code",
        pluginName: "react-doctor",
        ruleId: "unused-export",
      },
    });

    expect(getScoringRuleKey(issue)).toBe("react-doctor/codebase/dead-code");
    expect(getScoringPluginKey(issue)).toBe("react-doctor");
  });

  it("keeps per-rule granularity for oxlint diagnostics", () => {
    const issue = createIssue({
      source: {
        checkId: "react-doctor/oxlint",
        pluginName: "react-doctor",
        ruleId: "no-fetch-in-effect",
      },
    });

    expect(getScoringRuleKey(issue)).toBe("no-fetch-in-effect");
  });

  it("falls back to issue.id when no source ruleId is present", () => {
    const issue = createIssue({ id: "synthetic-id" });

    expect(getScoringRuleKey(issue)).toBe("synthetic-id");
  });

  it("ignores non-react-doctor checkIds (treats them as plain ruleId carriers)", () => {
    const issue = createIssue({
      source: {
        checkId: "third-party/check",
        pluginName: "third-party",
        ruleId: "some-rule",
      },
    });

    expect(getScoringRuleKey(issue)).toBe("some-rule");
    expect(getScoringPluginKey(issue)).toBe("third-party");
  });
});

describe("tryScoreFromApi wire format", () => {
  it("sends {plugin, rule, category, severity} and collapses custom-check sub-rules", async () => {
    const issues: ReactDoctorIssue[] = [
      createIssue({
        id: "react-doctor/codebase/dead-code/unused-file/src/a.ts",
        source: {
          checkId: "react-doctor/codebase/dead-code",
          pluginName: "react-doctor",
          ruleId: "unused-file",
        },
      }),
      createIssue({
        id: "react-doctor/codebase/dead-code/unused-export/src/a.ts/Helper",
        source: {
          checkId: "react-doctor/codebase/dead-code",
          pluginName: "react-doctor",
          ruleId: "unused-export",
        },
      }),
      createIssue({
        id: "react-doctor/oxlint/no-fetch-in-effect/src/widget.tsx/9",
        severity: "error",
        category: "oxlint",
        source: {
          checkId: "react-doctor/oxlint",
          pluginName: "react-doctor",
          ruleId: "no-fetch-in-effect",
        },
      }),
    ];

    let capturedBody: unknown = null;
    const stubFetch: typeof fetch = async (_url, init) => {
      capturedBody = JSON.parse(String(init?.body ?? "null"));
      return new Response(JSON.stringify({ score: 88, label: "Great" }), { status: 200 });
    };

    const result = await tryScoreFromApi(issues, stubFetch, { silent: true });

    expect(result).toEqual({ value: 88, label: "Great" });
    expect(capturedBody).toEqual({
      diagnostics: [
        {
          plugin: "react-doctor",
          rule: "react-doctor/codebase/dead-code",
          category: "codebase",
          severity: "warning",
        },
        {
          plugin: "react-doctor",
          rule: "react-doctor/codebase/dead-code",
          category: "codebase",
          severity: "warning",
        },
        {
          plugin: "react-doctor",
          rule: "no-fetch-in-effect",
          category: "oxlint",
          severity: "error",
        },
      ],
    });
  });

  it("suppresses console output when silent is set", async () => {
    const originalWarn = console.warn;
    const warnCalls: string[] = [];
    console.warn = (message: string) => {
      warnCalls.push(message);
    };
    try {
      const stubFetch: typeof fetch = async () => new Response("oops", { status: 500 });
      const result = await tryScoreFromApi([], stubFetch, { silent: true });
      expect(result).toBeNull();
      expect(warnCalls).toEqual([]);
    } finally {
      console.warn = originalWarn;
    }
  });
});
