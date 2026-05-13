import { describe, expect, it } from "vite-plus/test";
import { calculateReactDoctorScore } from "../src/sdk/index.js";
import { tryScoreFromApi } from "../src/core/try-score-from-api.js";
import type { ReactDoctorIssue } from "../src/sdk/index.js";

const createDeadCodeIssue = (ruleId: string, filePath: string): ReactDoctorIssue => ({
  id: `react-doctor/codebase/dead-code/${ruleId}/${filePath}`,
  title: "Dead code",
  message: "Sample dead code finding",
  severity: "warning",
  category: "codebase",
  location: { filePath },
  source: {
    checkId: "react-doctor/codebase/dead-code",
    pluginName: "react-doctor",
    ruleId,
  },
});

const createOxlintIssue = (ruleId: string, filePath: string, line: number): ReactDoctorIssue => ({
  id: `react-doctor/oxlint/${ruleId}/${filePath}/${line}`,
  title: ruleId,
  message: "Sample oxlint finding",
  severity: "warning",
  category: "oxlint",
  location: { filePath, line },
  source: {
    checkId: "react-doctor/oxlint",
    pluginName: "react-doctor",
    ruleId,
  },
});

const createInfoCodebaseIssue = (ruleId: string, filePath: string): ReactDoctorIssue => ({
  id: `react-doctor/codebase/dead-code/${ruleId}/${filePath}`,
  title: "Dead code",
  message: "Informational dead code finding",
  severity: "info",
  category: "codebase",
  location: { filePath },
  source: {
    checkId: "react-doctor/codebase/dead-code",
    pluginName: "react-doctor",
    ruleId,
  },
});

describe("calculateReactDoctorScore", () => {
  it("scores a clean codebase at the perfect score", () => {
    expect(calculateReactDoctorScore([]).value).toBe(100);
  });

  it("ignores info-severity issues when scoring", () => {
    const informationalIssues: ReactDoctorIssue[] = [];
    for (let infoIndex = 0; infoIndex < 50; infoIndex += 1) {
      informationalIssues.push(
        createInfoCodebaseIssue("unused-type-export", `src/types-${infoIndex}.ts`),
      );
    }
    expect(calculateReactDoctorScore(informationalIssues).value).toBe(100);
  });

  it("still scores warnings and errors mixed alongside info-severity findings", () => {
    const mixedIssues: ReactDoctorIssue[] = [
      createInfoCodebaseIssue("unused-type-export", "src/types.ts"),
      createInfoCodebaseIssue("namespace-only-export", "src/aliases.ts"),
      // 3 warnings × 0.5 = 1.5 penalty → score 99 (rounded). Without
      // info-severity ignored, the two info-severity issues above would
      // bump the count to 5 rules and drop the score further.
      createOxlintIssue("no-fetch-in-effect", "src/widget.tsx", 9),
      createOxlintIssue("no-array-index-as-key", "src/list.tsx", 4),
      createOxlintIssue("nextjs-no-img-element", "src/hero.tsx", 14),
    ];
    expect(calculateReactDoctorScore(mixedIssues).value).toBe(99);
  });

  it("groups sub-rule IDs of a single custom check into one scoring entry", () => {
    const issues: ReactDoctorIssue[] = [];
    const subRuleIds = [
      "unused-file",
      "unused-export",
      "unused-type-export",
      "namespace-only-export",
      "duplicate-export",
      "unused-enum-member",
      "unused-class-member",
    ];
    for (const ruleId of subRuleIds) {
      for (let inner = 0; inner < 10; inner += 1) {
        issues.push(createDeadCodeIssue(ruleId, `src/dead-${ruleId}-${inner}.ts`));
      }
    }
    // 70 issues × 1 distinct check key → 0.5 × min(1+log2(70), 4) ≈ 2.0 penalty
    expect(calculateReactDoctorScore(issues).value).toBe(98);
  });

  it("keeps oxlint sub-rules scored independently", () => {
    const issues: ReactDoctorIssue[] = [
      createOxlintIssue("no-array-index-as-key", "src/list.tsx", 4),
      createOxlintIssue("no-fetch-in-effect", "src/widget.tsx", 9),
      createOxlintIssue("nextjs-no-img-element", "src/hero.tsx", 14),
    ];
    // 3 oxlint rules × 1 issue each → 3 × 0.5 = 1.5 penalty, rounded to 99
    expect(calculateReactDoctorScore(issues).value).toBe(99);
  });

  it("caps any single category's penalty so one noisy area can't tank the score", () => {
    const issues: ReactDoctorIssue[] = [];
    for (let ruleIndex = 0; ruleIndex < 200; ruleIndex += 1) {
      issues.push(createOxlintIssue(`rule-${ruleIndex}`, "src/file.tsx", ruleIndex));
    }
    // 200 oxlint rules × 0.5 = 100 raw penalty, capped at the per-category
    // cap (35). Score = 100 - 35 = 65.
    expect(calculateReactDoctorScore(issues).value).toBe(65);
  });

  it("still floors at zero when penalties accumulate across categories", () => {
    const issues: ReactDoctorIssue[] = [];
    // Multiple categories at the cap blow past 100 total — simulate 4
    // distinct categories with enough rules to each hit the cap.
    const categories = ["oxlint", "codebase", "lint", "perf"];
    for (const category of categories) {
      for (let ruleIndex = 0; ruleIndex < 100; ruleIndex += 1) {
        issues.push({
          id: `${category}/${ruleIndex}`,
          title: `${category}-${ruleIndex}`,
          message: "Sample",
          severity: "error",
          category,
          location: { filePath: "src/file.tsx", line: ruleIndex },
          source: {
            checkId: `react-doctor/${category}/${ruleIndex}`,
            pluginName: "react-doctor",
            ruleId: `${category}-${ruleIndex}`,
          },
        });
      }
    }
    expect(calculateReactDoctorScore(issues).value).toBe(0);
  });

  it("sends custom check score keys to the remote scorer", async () => {
    const issues = [
      createDeadCodeIssue("unused-file", "src/a.ts"),
      createDeadCodeIssue("unused-export", "src/b.ts"),
      createOxlintIssue("no-fetch-in-effect", "src/widget.tsx", 9),
    ];
    let requestBody: unknown = null;
    const fetchImplementation = (async (_url: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({ score: 98, label: "Great" });
    }) as typeof fetch;

    await tryScoreFromApi(issues, fetchImplementation);

    expect(requestBody).toEqual({
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
          severity: "warning",
        },
      ],
    });
  });
});
