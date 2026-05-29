import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Diagnostic } from "@react-doctor/core";
import { groupBy } from "@react-doctor/core";
import { formatRuleSummary, sortRuleGroupsByImportance } from "./render-diagnostics.js";

export const writeDiagnosticsDirectory = (diagnostics: Diagnostic[]): string => {
  const outputDirectory = join(tmpdir(), `react-doctor-${randomUUID()}`);
  // Owner-only (0700/0600): the dump holds source snippets + absolute
  // paths and lives in a world-listable tmp dir on shared/CI hosts.
  mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });

  const ruleGroups = groupBy(
    diagnostics,
    (diagnostic) => `${diagnostic.plugin}/${diagnostic.rule}`,
  );
  const sortedRuleGroups = sortRuleGroupsByImportance([...ruleGroups.entries()]);

  for (const [ruleKey, ruleDiagnostics] of sortedRuleGroups) {
    const fileName = ruleKey.replace(/\//g, "--") + ".txt";
    writeFileSync(join(outputDirectory, fileName), formatRuleSummary(ruleKey, ruleDiagnostics), {
      mode: 0o600,
    });
  }

  writeFileSync(join(outputDirectory, "diagnostics.json"), JSON.stringify(diagnostics), {
    mode: 0o600,
  });

  return outputDirectory;
};
