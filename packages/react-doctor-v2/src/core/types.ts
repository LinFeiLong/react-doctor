import type { ReactDoctorErrorInfo } from "./errors.js";

export interface SourceLocation {
  filePath: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export interface ReactDoctorIssueSource {
  checkId: string;
  pluginName?: string;
  ruleId?: string;
}

export interface ReactDoctorIssue {
  id: string;
  title: string;
  message: string;
  severity: "error" | "warning" | "info";
  category: string;
  location?: SourceLocation;
  recommendation?: string;
  source?: ReactDoctorIssueSource;
}

export interface ReactDoctorCheckResult {
  id: string;
  name: string;
  status: "completed" | "failed" | "skipped";
  issues: ReactDoctorIssue[];
  durationMilliseconds: number;
  error?: ReactDoctorErrorInfo;
}

export interface ReactDoctorScore {
  value: number;
  label: string;
}

export interface ReactProjectInfo {
  rootDirectory: string;
}

export interface ReactDoctorResult {
  status: "completed" | "completed-with-errors" | "failed";
  project: ReactProjectInfo;
  issues: ReactDoctorIssue[];
  checks: ReactDoctorCheckResult[];
  score: ReactDoctorScore | null;
  startedAt: string;
  completedAt: string;
  durationMilliseconds: number;
}

export interface ReactDoctorRuleSelection {
  enabledRuleIds?: string[];
  disabledRuleIds?: string[];
}

export interface InspectReactProjectOptions {
  rootDirectory?: string;
  includePaths?: string[];
  excludePatterns?: string[];
  rules?: ReactDoctorRuleSelection;
  signal?: AbortSignal;
}
