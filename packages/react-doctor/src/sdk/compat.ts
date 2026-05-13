import path from "node:path";
import { clearReactDoctorConfigCache, loadReactDoctorConfig } from "../core/config.js";
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
  projectName: result.project.projectName || path.basename(result.project.rootDirectory),
  reactVersion: result.project.reactVersion,
  tailwindVersion: result.project.tailwindVersion,
  framework: result.project.framework,
  hasTypeScript: result.project.hasTypeScript,
  hasReactCompiler: result.project.hasReactCompiler,
  hasTanStackQuery: result.project.hasTanStackQuery,
  sourceFileCount: result.project.sourceFileCount,
});

const toInspectOptions = (
  directory: string,
  options: DiagnoseOptions,
): InspectReactProjectOptions => ({
  rootDirectory: directory,
  includePaths: options.includePaths,
  signal: options.signal,
});

// Compat default: when neither the caller nor the on-disk config specifies a
// value, run lint, dead-code, and inline-disable resolution. Matches the v1
// diagnose() shape and the CLI defaults, while keeping the on-disk config the
// source of truth.
const resolveCompatBoolean = (
  callerValue: boolean | undefined,
  diskValue: boolean | undefined,
): boolean => callerValue ?? diskValue ?? true;

/**
 * @deprecated Use `createReactDoctor({ rootDirectory }).inspect()` from the main SDK instead.
 */
export const diagnose = async (
  directory: string,
  options: DiagnoseOptions = {},
): Promise<DiagnoseResult> => {
  const requestedRootDirectory = path.resolve(directory);
  const loadedConfig = await loadReactDoctorConfig(requestedRootDirectory);
  const diskConfig = loadedConfig?.config;
  const result = await inspectReactProjectCore({
    ...toInspectOptions(directory, options),
    lint: resolveCompatBoolean(options.lint, diskConfig?.lint),
    deadCode: resolveCompatBoolean(options.deadCode, diskConfig?.deadCode),
    respectInlineDisables: resolveCompatBoolean(
      options.respectInlineDisables,
      diskConfig?.respectInlineDisables,
    ),
    loadedConfig,
  });

  return {
    diagnostics: result.issues.map(toDiagnostic),
    score: toScoreResult(result.score),
    project: toProjectInfo(result),
    elapsedMilliseconds: result.durationMilliseconds,
  };
};

export const clearCaches = (): void => {
  clearReactDoctorConfigCache();
};
