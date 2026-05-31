import { groupBy, TOP_ERRORS_DISPLAY_COUNT } from "@react-doctor/core";
import type { Diagnostic } from "@react-doctor/core";
import { HANDOFF_MAX_FILES_PER_RULE } from "./constants.js";
import { formatFixRecipeLine, sortRuleGroupsByImportance } from "./render-diagnostics.js";
import { writeDiagnosticsDirectory } from "./write-diagnostics-directory.js";

export interface HandoffPayloadInput {
  readonly diagnostics: ReadonlyArray<Diagnostic>;
  readonly projectName: string;
}

// A focused prompt for the chosen agent: solve the TOP-N issues this pass,
// with the full set of findings written to disk (diagnostics.json + a .txt
// per rule) for follow-up. Keeps the first pass small & high-signal rather
// than dumping every issue inline.
export const buildHandoffPayload = (input: HandoffPayloadInput): string => {
  const ruleGroups = sortRuleGroupsByImportance([
    ...groupBy([...input.diagnostics], (diagnostic) => `${diagnostic.plugin}/${diagnostic.rule}`),
  ]);
  const topGroups = ruleGroups.slice(0, TOP_ERRORS_DISPLAY_COUNT);

  let diagnosticsDirectory: string | null = null;
  try {
    diagnosticsDirectory = writeDiagnosticsDirectory([...input.diagnostics]);
  } catch {}

  const lines: string[] = [
    `Fix the top ${topGroups.length} React Doctor ${topGroups.length === 1 ? "issue" : "issues"} in ${input.projectName} on this pass — leave the rest for a follow-up.`,
    "",
  ];

  topGroups.forEach(([ruleKey, ruleDiagnostics], index) => {
    const representative = ruleDiagnostics[0]!;
    const severityLabel = representative.severity === "error" ? "ERROR" : "WARN";
    lines.push(
      `${index + 1}. ${severityLabel} ${representative.category}: ${representative.title ?? ruleKey} (×${ruleDiagnostics.length})`,
      `   ${representative.message}`,
      `   ${formatFixRecipeLine(representative)}`,
    );
    const uniqueFiles = [...new Set(ruleDiagnostics.map((diagnostic) => diagnostic.filePath))];
    for (const filePath of uniqueFiles.slice(0, HANDOFF_MAX_FILES_PER_RULE)) {
      const firstSite = ruleDiagnostics.find(
        (diagnostic) => diagnostic.filePath === filePath && diagnostic.line > 0,
      );
      lines.push(`   - ${filePath}${firstSite ? `:${firstSite.line}` : ""}`);
    }
    const remainingFiles = uniqueFiles.length - HANDOFF_MAX_FILES_PER_RULE;
    if (remainingFiles > 0) lines.push(`   - +${remainingFiles} more files`);
  });

  lines.push("");
  if (diagnosticsDirectory) {
    lines.push(
      `Full results for all ${input.diagnostics.length} issues (diagnostics.json + a .txt per rule): ${diagnosticsDirectory}`,
      "",
    );
  }
  lines.push(
    "Read each file and fix the root cause — don't suppress. When the top issues are done, run `npx react-doctor@latest --verbose` to verify, then work through the rest from the full results above.",
  );

  return lines.join("\n");
};
