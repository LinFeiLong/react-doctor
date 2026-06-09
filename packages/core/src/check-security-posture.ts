import { REACT_DOCTOR_RULES } from "oxlint-plugin-react-doctor";
import type { PostureScan } from "oxlint-plugin-react-doctor";
import { buildSecurityPostureDiagnostic } from "./checks/security-posture/build-security-posture-diagnostic.js";
import type { SecurityPostureRuleEntry } from "./checks/security-posture/build-security-posture-diagnostic.js";
import { collectSecurityPostureFiles } from "./checks/security-posture/collect-security-posture-files.js";
import { buildCapabilities, shouldEnableRule } from "./runners/oxlint/capabilities.js";
import type { Diagnostic, ProjectInfo } from "./types/index.js";

export interface CheckSecurityPostureOptions {
  readonly project?: ProjectInfo;
  readonly ignoredTags?: ReadonlySet<string>;
}

interface EnabledPostureRule {
  readonly entry: SecurityPostureRuleEntry;
  readonly scan: PostureScan;
}

// Project-level security posture check: registry rules carrying a posture
// `scan` are excluded from the generated oxlint config and instead run here
// over one bounded whole-tree walk (shipped artifacts, dotenv/config files,
// SQL — paths lint never sees). Selection goes through the same
// `shouldEnableRule` capability/tag gate as lint rules, so `--ignore-tag
// security-posture` and `disabledBy` behave identically across both engines.
export const checkSecurityPosture = (
  rootDirectory: string,
  options: CheckSecurityPostureOptions = {},
): Diagnostic[] => {
  const capabilities = options.project ? buildCapabilities(options.project) : new Set<string>();
  const ignoredTags = options.ignoredTags ?? new Set<string>();

  const enabledPostureRules: EnabledPostureRule[] = REACT_DOCTOR_RULES.flatMap((entry) => {
    const rule = entry.rule;
    const scan = rule.scan;
    if (typeof scan !== "function") return [];
    if (rule.defaultEnabled === false) return [];
    if (!shouldEnableRule(rule.requires, rule.tags, capabilities, ignoredTags, rule.disabledBy)) {
      return [];
    }
    return [{ entry, scan }];
  });
  if (enabledPostureRules.length === 0) return [];

  const diagnostics: Diagnostic[] = [];
  const seen = new Set<string>();

  for (const file of collectSecurityPostureFiles(rootDirectory)) {
    for (const { entry, scan } of enabledPostureRules) {
      for (const finding of scan(file)) {
        const diagnostic = buildSecurityPostureDiagnostic(finding, entry, file.relativePath);
        const key = `${diagnostic.rule}:${diagnostic.filePath}:${diagnostic.line}:${diagnostic.column}:${diagnostic.message}`;
        if (seen.has(key)) continue;
        seen.add(key);
        diagnostics.push(diagnostic);
      }
    }
  }

  return diagnostics;
};
