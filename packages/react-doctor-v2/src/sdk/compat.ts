import path from "node:path";
import { inspectReactProjectCore } from "../core/inspect-react-project.js";
import type {
  InspectReactProjectOptions,
  ReactDoctorIssue,
  ReactDoctorResult,
  ReactDoctorScore,
} from "../core/types.js";

export interface Diagnostic {
  filePath: string;
  plugin: string;
  rule: string;
  severity: "error" | "warning";
  message: string;
  help: string;
  url?: string;
  line: number;
  column: number;
  category: string;
  suppressionHint?: string;
}

export interface ScoreResult {
  score: number;
  label: string;
}

export interface ProjectInfo {
  rootDirectory: string;
  projectName: string;
  reactVersion: string | null;
  tailwindVersion: string | null;
  framework: string;
  hasTypeScript: boolean;
  hasReactCompiler: boolean;
  hasTanStackQuery: boolean;
  sourceFileCount: number;
}

export interface DiagnoseOptions {
  lint?: boolean;
  deadCode?: boolean;
  verbose?: boolean;
  includePaths?: string[];
  respectInlineDisables?: boolean;
  signal?: AbortSignal;
}

export interface DiagnoseResult {
  diagnostics: Diagnostic[];
  score: ScoreResult | null;
  project: ProjectInfo;
  elapsedMilliseconds: number;
}

const toDiagnostic = (issue: ReactDoctorIssue): Diagnostic => ({
  filePath: issue.location?.filePath ?? "",
  plugin: issue.source?.pluginName ?? issue.source?.checkId ?? "react-doctor",
  rule: issue.source?.ruleId ?? issue.id,
  severity: issue.severity === "error" ? "error" : "warning",
  message: issue.message,
  help: issue.recommendation ?? "",
  line: issue.location?.line ?? 0,
  column: issue.location?.column ?? 0,
  category: issue.category,
});

const toScoreResult = (score: ReactDoctorScore | null): ScoreResult | null =>
  score ? { score: score.value, label: score.label } : null;

const toProjectInfo = (result: ReactDoctorResult): ProjectInfo => ({
  rootDirectory: result.project.rootDirectory,
  projectName: path.basename(result.project.rootDirectory),
  reactVersion: null,
  tailwindVersion: null,
  framework: "unknown",
  hasTypeScript: false,
  hasReactCompiler: false,
  hasTanStackQuery: false,
  sourceFileCount: 0,
});

const toInspectOptions = (
  directory: string,
  options: DiagnoseOptions,
): InspectReactProjectOptions => ({
  rootDirectory: directory,
  includePaths: options.includePaths,
  signal: options.signal,
});

/**
 * @deprecated Use `createReactDoctor({ rootDirectory }).inspect()` from the main SDK instead.
 */
export const diagnose = async (
  directory: string,
  options: DiagnoseOptions = {},
): Promise<DiagnoseResult> => {
  const result = await inspectReactProjectCore(toInspectOptions(directory, options));

  return {
    diagnostics: result.issues.map(toDiagnostic),
    score: toScoreResult(result.score),
    project: toProjectInfo(result),
    elapsedMilliseconds: result.durationMilliseconds,
  };
};

export const clearCaches = (): void => {};
