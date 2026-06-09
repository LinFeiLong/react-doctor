import type { PostureFinding, Rule } from "oxlint-plugin-react-doctor";
import type { Diagnostic } from "../../types/index.js";

export interface SecurityPostureRuleEntry {
  readonly id: string;
  readonly rule: Pick<Rule, "severity" | "title" | "recommendation">;
}

// Shared shape for every security-posture diagnostic. Metadata is
// single-sourced from the registry rule (plugin severity vocab `warn`
// maps to core `warning`); a finding may override `severity`/`title`/
// `help` for dynamic escalation (e.g. `public-debug-artifact` when the
// artifact carries a live secret).
export const buildSecurityPostureDiagnostic = (
  finding: PostureFinding,
  entry: SecurityPostureRuleEntry,
  relativePath: string,
): Diagnostic => ({
  filePath: relativePath,
  plugin: "react-doctor",
  rule: entry.id,
  severity: (finding.severity ?? entry.rule.severity) === "warn" ? "warning" : "error",
  title: finding.title ?? entry.rule.title ?? entry.id,
  message: finding.message,
  help: finding.help ?? entry.rule.recommendation ?? "",
  line: finding.line,
  column: finding.column,
  category: "Security",
});
