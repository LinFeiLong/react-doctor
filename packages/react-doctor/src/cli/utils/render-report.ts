import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import { highlighter } from "@react-doctor/core";
import type { Diagnostic, ScoreResult } from "@react-doctor/core";
import {
  buildCountsSummaryLines,
  buildIssueCountLabel,
  buildMergedOverflowLine,
  buildTopErrorBlocks,
  printCategoryBreakdown,
  printWarningRollup,
  type SourceRootResolver,
} from "./render-diagnostics.js";
import { printAgentGuidance } from "./render-agent-guidance.js";
import {
  animateScoreProjection,
  printBrandingOnlyHeader,
  printNoScoreHeader,
  printScoreHeader,
} from "./render-score-header.js";
import {
  buildImproveLine,
  buildShareLine,
  printDocsNote,
  printVerboseTip,
} from "./render-summary.js";

export interface InspectReportInput {
  readonly diagnostics: Diagnostic[];
  readonly score: ScoreResult | null;
  // Score reachable by fixing the top errors; drives the projected score bar
  // and the "you could improve" line. Omitted when there's nothing to project.
  readonly potentialScore?: number | null;
  readonly projectName: string;
  readonly sourceRoot: string | SourceRootResolver;
  readonly rulePriority?: ReadonlyMap<string, number>;
  readonly outputSurface: string;
  readonly demotedDiagnosticCount: number;
  readonly noScoreMessage: string;
  readonly isOffline: boolean;
  readonly hasSkippedChecks: boolean;
  readonly skippedChecks: ReadonlyArray<string>;
  readonly verbose: boolean;
  readonly isNonInteractiveEnvironment: boolean;
  // The onboarding beat played before each section up to and including the
  // score. Defaults to a no-op so normal runs render with zero delay.
  readonly sectionPause?: Effect.Effect<void>;
  // The (shorter) beat for everything after the score — the report quickens
  // once the headline lands. Defaults to `sectionPause`.
  readonly sectionPauseFast?: Effect.Effect<void>;
  // Count the category tallies up from zero (first-run onboarding on a TTY).
  readonly animateCountUp?: boolean;
  // Whether to show the "set up CI/CD" docs tip (false when CI/CD already set up).
  readonly showCiCdTip?: boolean;
}

// The non-verbose single-project report, in reading order: category tally,
// score, projection, top fixes, warning roll-up, merged overflow, footer.
// First-run onboarding only layers the count-up and `sectionPause` beats on top.
export const printInspectReport = (input: InspectReportInput): Effect.Effect<void> =>
  Effect.gen(function* () {
    const pause = input.sectionPause ?? Effect.void;
    // The report quickens once the score lands; defaults to the same beat.
    const fastPause = input.sectionPauseFast ?? pause;
    const { diagnostics, rulePriority } = input;
    const animate = input.animateCountUp ?? false;
    const issueLabel = buildIssueCountLabel(diagnostics);

    yield* pause;
    yield* printCategoryBreakdown(diagnostics, rulePriority, animate);

    yield* Console.log("");
    yield* pause;
    if (input.hasSkippedChecks) {
      yield* printBrandingOnlyHeader;
      yield* Console.log(highlighter.gray("  Score not shown — some checks could not complete."));
      for (const line of buildCountsSummaryLines(diagnostics)) yield* Console.log(line);
    } else if (input.score) {
      // Issue count rides inline on the score line. When animating, the bar
      // draws plain here and the ghost gain is revealed later (see below).
      yield* printScoreHeader(
        input.score,
        animate ? undefined : (input.potentialScore ?? undefined),
        issueLabel ?? "",
      );
    } else {
      yield* printNoScoreHeader(input.noScoreMessage);
      for (const line of buildCountsSummaryLines(diagnostics)) yield* Console.log(line);
    }

    // The score box prints a trailing blank, so the first section after it
    // skips its own leading blank to keep a single gap. (The no-score / skipped
    // branches above already consumed that blank with the count line.)
    let scoreBlankPending = input.score != null && !input.hasSkippedChecks;
    const leadingGap = Effect.gen(function* () {
      if (scoreBlankPending) {
        scoreBlankPending = false;
      } else {
        yield* Console.log("");
      }
    });

    // Share sits directly under the score box.
    if (!input.isOffline) {
      yield* leadingGap;
      yield* fastPause;
      yield* Console.log(buildShareLine(diagnostics, input.score, input.projectName));
    }

    const improveLine = buildImproveLine(input.score, input.potentialScore);
    if (improveLine) {
      yield* leadingGap;
      yield* fastPause;
      yield* Console.log(improveLine);
      // Then grow the bar's projected gain in, eased, in sync with that line.
      // Rows from the cursor up to the bar: the box's trailing blank, branding,
      // └, this line + its leading blank, and (when shown) the Share line above.
      const barRowsAboveCursor = input.isOffline ? 5 : 7;
      if (animate && input.score && !input.hasSkippedChecks && input.potentialScore != null) {
        yield* animateScoreProjection(input.score, input.potentialScore, barRowsAboveCursor);
      }
    }

    for (const block of buildTopErrorBlocks(diagnostics, input.sourceRoot, rulePriority)) {
      yield* leadingGap;
      yield* fastPause;
      for (const line of block) yield* Console.log(line);
    }

    if (input.isNonInteractiveEnvironment && input.outputSurface !== "prComment") {
      yield* leadingGap;
      yield* printAgentGuidance();
    }

    const overflowLine = buildMergedOverflowLine(diagnostics, rulePriority);
    if (overflowLine) {
      yield* leadingGap;
      yield* fastPause;
      yield* Console.log(overflowLine);
    }

    if (diagnostics.some((diagnostic) => diagnostic.severity === "warning")) {
      yield* leadingGap;
      yield* fastPause;
      yield* printWarningRollup(diagnostics, rulePriority, animate);
    }

    if (input.demotedDiagnosticCount > 0) {
      yield* leadingGap;
      yield* fastPause;
      yield* Console.log(
        highlighter.gray(
          `  ${input.demotedDiagnosticCount} demoted from the ${input.outputSurface} surface (e.g. design cleanup) — run \`npx react-doctor@latest .\` locally for the full list.`,
        ),
      );
    }

    if (input.hasSkippedChecks) {
      yield* leadingGap;
      yield* fastPause;
      const skippedLabel = input.skippedChecks.join(" and ");
      yield* Console.warn(
        highlighter.warn(`  Note: ${skippedLabel} checks failed — score may be incomplete.`),
      );
    }

    // `printDocsNote` opens with its own blank line, so it spaces itself.
    yield* fastPause;
    yield* printDocsNote(input.showCiCdTip ?? true);

    yield* Console.log("");
    yield* fastPause;
    yield* printVerboseTip(diagnostics, input.verbose);
  });
