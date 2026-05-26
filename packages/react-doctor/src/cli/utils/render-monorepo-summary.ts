import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import {
  highlighter,
  PERFECT_SCORE,
  SCORE_GOOD_THRESHOLD,
  SCORE_OK_THRESHOLD,
  toRelativePath,
} from "@react-doctor/core";
import type { Diagnostic, InspectResult, ScoreResult } from "@react-doctor/core";
import { colorizeByScore } from "./colorize-by-score.js";
import { printScoreHeader } from "./render-score-header.js";
import { buildShareUrl } from "./render-summary.js";

export interface MonorepoSummaryScan {
  readonly directory: string;
  readonly result: InspectResult;
}

export interface PrintMonorepoSummaryInput {
  readonly scans: ReadonlyArray<MonorepoSummaryScan>;
  /** Root the per-project paths render relative to. */
  readonly rootDirectory: string;
  /** Drives whether the share URL row is suppressed (CI / --no-score / config.share). */
  readonly isOffline: boolean;
}

const SEVERITY_DOT = "●";
const DETAIL_PREFIX = "↳";

const labelForCombinedScore = (score: number): string => {
  if (score >= SCORE_GOOD_THRESHOLD) return "Great";
  if (score >= SCORE_OK_THRESHOLD) return "Needs work";
  return "Critical";
};

interface ComputedCombinedScore {
  readonly score: number;
  readonly totalSourceFileCount: number;
  readonly scoredProjectCount: number;
}

const computeCombinedScore = (
  scans: ReadonlyArray<MonorepoSummaryScan>,
): ComputedCombinedScore | null => {
  let weightedSum = 0;
  let totalWeight = 0;
  let scoredProjectCount = 0;
  let totalSourceFileCount = 0;
  for (const scan of scans) {
    if (!scan.result.score) continue;
    // Files-as-weight: a single source file lifts the project off zero
    // so a tiny package can't dominate or vanish vs. a project that
    // never produced a file count.
    const weight = Math.max(scan.result.project.sourceFileCount, 1);
    weightedSum += scan.result.score.score * weight;
    totalWeight += weight;
    totalSourceFileCount += scan.result.project.sourceFileCount;
    scoredProjectCount += 1;
  }
  if (scoredProjectCount === 0 || totalWeight === 0) return null;
  return {
    score: Math.round(weightedSum / totalWeight),
    totalSourceFileCount,
    scoredProjectCount,
  };
};

interface PerProjectRow {
  readonly relativePath: string;
  readonly score: ScoreResult | null;
  readonly sourceFileCount: number;
  readonly shareUrl: string | null;
  readonly diagnosticsDirectory: string | null;
  readonly issueCount: number;
  readonly errorCount: number;
}

const buildRow = (
  scan: MonorepoSummaryScan,
  rootDirectory: string,
  isOffline: boolean,
): PerProjectRow => {
  const surfaceDiagnostics: ReadonlyArray<Diagnostic> = scan.result.diagnostics;
  const errorCount = surfaceDiagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  ).length;
  const relativePath = toRelativePath(scan.directory, rootDirectory) || ".";
  return {
    relativePath,
    score: scan.result.score,
    sourceFileCount: scan.result.project.sourceFileCount,
    shareUrl: isOffline
      ? null
      : buildShareUrl(surfaceDiagnostics, scan.result.score, scan.result.project.projectName),
    diagnosticsDirectory: scan.result.diagnosticsDirectory,
    issueCount: surfaceDiagnostics.length,
    errorCount,
  };
};

const padRight = (text: string, width: number): string =>
  text.length >= width ? text : text + " ".repeat(width - text.length);

const padLeft = (text: string, width: number): string =>
  text.length >= width ? text : " ".repeat(width - text.length) + text;

// Worst first. Unscored projects sink to the bottom so the user's eye
// lands on the most-urgent project rather than on rows we can't compare.
const sortRowsByUrgency = (rows: ReadonlyArray<PerProjectRow>): PerProjectRow[] =>
  rows.toSorted((a, b) => {
    if (a.score === null && b.score === null) return a.relativePath.localeCompare(b.relativePath);
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    if (a.score.score !== b.score.score) return a.score.score - b.score.score;
    return a.relativePath.localeCompare(b.relativePath);
  });

const formatFileCount = (count: number): string => {
  const formatted = count.toLocaleString();
  return `${formatted} ${count === 1 ? "file" : "files"}`;
};

const printPerProjectRow = (row: PerProjectRow, nameWidth: number): Effect.Effect<void> =>
  Effect.gen(function* () {
    const scoreText = row.score ? padLeft(String(row.score.score), 3) : padLeft("—", 3);
    const score = row.score
      ? colorizeByScore(scoreText, row.score.score)
      : highlighter.gray(scoreText);
    const dot = row.score ? colorizeByScore(SEVERITY_DOT, row.score.score) : highlighter.gray("·");
    const name = highlighter.bold(padRight(row.relativePath, nameWidth));
    const labelText = row.score
      ? colorizeByScore(row.score.label, row.score.score)
      : highlighter.gray("score unavailable");
    const meta = highlighter.dim(
      `· ${formatFileCount(row.sourceFileCount)} · ${row.issueCount} ${row.issueCount === 1 ? "issue" : "issues"}`,
    );
    yield* Console.log(`  ${score}  ${dot}  ${name}  ${labelText}  ${meta}`);

    // 2 leading + 3 score + 2 + 1 dot + 2 + nameWidth = 10 + nameWidth.
    // Re-anchor detail lines under the project name so they read as a
    // continuation, not a new column.
    const detailIndent = " ".repeat(10) + " ".repeat(nameWidth - 1);
    if (row.shareUrl) {
      yield* Console.log(
        `${detailIndent}${highlighter.gray(DETAIL_PREFIX)} ${highlighter.info(row.shareUrl)}`,
      );
    }
    if (row.diagnosticsDirectory) {
      yield* Console.log(
        `${detailIndent}${highlighter.gray(DETAIL_PREFIX)} ${highlighter.gray(row.diagnosticsDirectory)}`,
      );
    }
  });

export const printMonorepoSummary = (input: PrintMonorepoSummaryInput): Effect.Effect<void> =>
  Effect.gen(function* () {
    if (input.scans.length === 0) return;

    const rawRows = input.scans.map((scan) =>
      buildRow(scan, input.rootDirectory, input.isOffline),
    );
    const rows = sortRowsByUrgency(rawRows);
    const nameWidth = rows.reduce(
      (widest, row) => Math.max(widest, row.relativePath.length),
      "project".length,
    );

    const combined = computeCombinedScore(input.scans);
    if (combined !== null) {
      const combinedScore: ScoreResult = {
        score: combined.score,
        label: labelForCombinedScore(combined.score),
      };
      yield* Console.log("");
      yield* Console.log(
        `  ${highlighter.bold("Combined score")}  ${highlighter.dim(`weighted across ${combined.scoredProjectCount} project${combined.scoredProjectCount === 1 ? "" : "s"} · ${combined.totalSourceFileCount.toLocaleString()} source files · ${PERFECT_SCORE} max`)}`,
      );
      yield* printScoreHeader(combinedScore);
    }

    yield* Console.log(
      `  ${highlighter.bold("By project")}  ${highlighter.dim(`worst first · ${rows.length} project${rows.length === 1 ? "" : "s"}`)}`,
    );
    yield* Console.log("");
    for (const row of rows) {
      yield* printPerProjectRow(row, nameWidth);
    }
    yield* Console.log("");
  });
