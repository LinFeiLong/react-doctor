import isUnicodeSupported from "is-unicode-supported";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import { groupBy, highlighter, MILLISECONDS_PER_SECOND, toRelativePath } from "@react-doctor/core";
import type { Diagnostic } from "@react-doctor/core";
import { indentMultilineText } from "./indent-multiline-text.js";
import type { TriageOutcome, TriagePriority, TriageVerdict } from "./triage.js";

const POINTER = isUnicodeSupported() ? "›" : ">";
const ERROR_GLYPH = isUnicodeSupported() ? "✗" : "X";
const WARNING_GLYPH = isUnicodeSupported() ? "⚠" : "!";

interface PriorityDescriptor {
  readonly priority: TriagePriority;
  readonly heading: string;
  readonly colorize: (text: string) => string;
  readonly glyph: string;
}

const PRIORITY_DESCRIPTORS: ReadonlyArray<PriorityDescriptor> = [
  { priority: "P0", heading: "Critical (P0)", colorize: highlighter.error, glyph: ERROR_GLYPH },
  { priority: "P1", heading: "Should fix (P1)", colorize: highlighter.error, glyph: ERROR_GLYPH },
  { priority: "P2", heading: "Fix soon (P2)", colorize: highlighter.warn, glyph: WARNING_GLYPH },
  { priority: "P3", heading: "Nice to have (P3)", colorize: highlighter.dim, glyph: WARNING_GLYPH },
];

const getDescriptor = (priority: TriagePriority): PriorityDescriptor =>
  PRIORITY_DESCRIPTORS.find((descriptor) => descriptor.priority === priority) ??
  PRIORITY_DESCRIPTORS[0];

const formatLocation = (diagnostic: Diagnostic, rootDirectory: string): string =>
  `${toRelativePath(diagnostic.filePath, rootDirectory)}:${String(diagnostic.line)}`;

const formatVerdictBlock = (
  verdict: TriageVerdict,
  rootDirectory: string,
): ReadonlyArray<string> => {
  const descriptor = getDescriptor(verdict.priority);
  const ruleKey = `${verdict.diagnostic.plugin}/${verdict.diagnostic.rule}`;
  return [
    `    ${descriptor.colorize(descriptor.glyph)} ${descriptor.colorize(ruleKey)} ${highlighter.dim(formatLocation(verdict.diagnostic, rootDirectory))}`,
    highlighter.gray(indentMultilineText(verdict.title, "        ")),
    highlighter.gray(indentMultilineText(verdict.description, "        ")),
  ];
};

const formatKeptSection = (
  verdicts: ReadonlyArray<TriageVerdict>,
  rootDirectory: string,
): ReadonlyArray<string> => {
  const groupedByPriority = groupBy([...verdicts], (verdict) => verdict.priority);
  const lines: string[] = [
    `${highlighter.bold(`${POINTER} Kept by Claude`)} ${highlighter.dim(`(${String(verdicts.length)})`)}`,
    "",
  ];
  for (const descriptor of PRIORITY_DESCRIPTORS) {
    const bucket = groupedByPriority.get(descriptor.priority) ?? [];
    if (bucket.length === 0) continue;
    lines.push(
      `  ${descriptor.colorize(descriptor.heading)} ${highlighter.dim(`(${String(bucket.length)})`)}`,
    );
    for (const verdict of bucket) {
      lines.push(...formatVerdictBlock(verdict, rootDirectory), "");
    }
  }
  return lines;
};

const formatSuppressedSection = (
  suppressed: ReadonlyArray<Diagnostic>,
  rootDirectory: string,
  verbose: boolean,
): ReadonlyArray<string> => {
  if (suppressed.length === 0) return [];

  const lines: string[] = [
    `${highlighter.bold(`${POINTER} Suppressed by Claude`)} ${highlighter.dim(`(${String(suppressed.length)})`)}`,
    highlighter.gray("    react-doctor flagged these, but Claude reviewed them in this codebase"),
    highlighter.gray("    and considers them false positives or low signal."),
    "",
  ];
  if (!verbose) {
    lines.push(highlighter.dim("    Run with --verbose to see each suppressed diagnostic."), "");
    return lines;
  }

  const groupedByRule = groupBy(
    [...suppressed],
    (diagnostic) => `${diagnostic.plugin}/${diagnostic.rule}`,
  );
  for (const [ruleKey, diagnostics] of groupedByRule) {
    lines.push(
      `    ${highlighter.gray(ruleKey)} ${highlighter.dim(`(${String(diagnostics.length)})`)}`,
    );
    for (const diagnostic of diagnostics) {
      lines.push(highlighter.gray(`      ${formatLocation(diagnostic, rootDirectory)}`));
    }
    lines.push("");
  }
  return lines;
};

const formatCostFragment = (totalCostUsd: number | null): string => {
  if (totalCostUsd === null || totalCostUsd <= 0) return "";
  return totalCostUsd < 0.01 ? " · <$0.01" : ` · $${totalCostUsd.toFixed(2)}`;
};

const formatSummaryLine = (outcome: TriageOutcome): string => {
  const keptBreakdown = PRIORITY_DESCRIPTORS.map((descriptor) => {
    const count = outcome.kept.filter((verdict) => verdict.priority === descriptor.priority).length;
    return `${descriptor.priority}:${String(count)}`;
  }).join(" ");
  const elapsedSeconds = (outcome.elapsedMilliseconds / MILLISECONDS_PER_SECOND).toFixed(1);
  return [
    `${highlighter.bold(`${POINTER} Triage`)} → ${highlighter.bold(`${String(outcome.kept.length)} kept`)} (${highlighter.gray(keptBreakdown)}) · ${String(outcome.suppressed.length)} suppressed`,
    highlighter.dim(
      `${elapsedSeconds}s · model: ${outcome.model}${formatCostFragment(outcome.totalCostUsd)}`,
    ),
  ].join(" · ");
};

export interface PrintTriageOutcomeInput {
  readonly outcome: TriageOutcome;
  readonly rootDirectory: string;
  readonly verbose: boolean;
}

export const printTriageOutcome = (input: PrintTriageOutcomeInput): Effect.Effect<void> =>
  Effect.gen(function* () {
    const { outcome, rootDirectory, verbose } = input;
    yield* Console.log("");

    if (outcome.kept.length === 0 && outcome.suppressed.length === 0) {
      yield* Console.log(highlighter.dim("  No diagnostics to triage."));
      return;
    }

    if (outcome.overflowed > 0) {
      yield* Console.log(
        highlighter.warn(
          `  ${String(outcome.overflowed)} diagnostics were skipped from triage to stay within the per-run cap — run on a tighter scope (e.g. --diff or --project <name>) to triage everything.`,
        ),
      );
      yield* Console.log("");
    }

    if (outcome.kept.length === 0) {
      yield* Console.log(
        highlighter.success(
          "  Claude reviewed every diagnostic and considers them all false positives in this codebase.",
        ),
      );
      yield* Console.log("");
    } else {
      for (const line of formatKeptSection(outcome.kept, rootDirectory)) {
        yield* Console.log(line);
      }
    }

    for (const line of formatSuppressedSection(outcome.suppressed, rootDirectory, verbose)) {
      yield* Console.log(line);
    }

    yield* Console.log(formatSummaryLine(outcome));
    yield* Console.log("");
  });
