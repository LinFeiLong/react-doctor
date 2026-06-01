import { highlighter, OUTPUT_MEASURE_WIDTH_CHARS } from "@react-doctor/core";

// The dim horizontal rule that separates major sections of a run
// (top-errors block, warning roll-up, the closing share/docs footer).
export const buildSectionDivider = (): string =>
  highlighter.dim(`  ${"─".repeat(OUTPUT_MEASURE_WIDTH_CHARS)}`);
