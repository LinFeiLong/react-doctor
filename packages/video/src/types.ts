export interface ScannedIssue {
  message: string;
  severity: "error" | "warning" | "ok";
  pointsLost: number;
  file: string;
}

export interface RuleScrollRow {
  ruleId: string;
  source: string;
  flags: string;
  badgeLabel: string;
  badgeText: string;
}

export interface RuleScrollGroup {
  title: string;
  subtitle: string;
  rows: RuleScrollRow[];
}
