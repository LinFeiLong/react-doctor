import path from "node:path";
import { DEFAULT_DIRECTORY } from "../constants.js";
import { createRuleRegistry } from "./rules/index.js";
import type { InspectReactProjectOptions, ReactDoctorResult } from "./types.js";

export const inspectReactProjectCore = async (
  options: InspectReactProjectOptions = {},
): Promise<ReactDoctorResult> => {
  options.signal?.throwIfAborted();

  const startedAt = new Date();
  const startedMilliseconds = globalThis.performance.now();
  const rootDirectory = path.resolve(options.rootDirectory ?? DEFAULT_DIRECTORY);

  options.signal?.throwIfAborted();

  const registry = createRuleRegistry();
  const checks = await registry.runRules({
    rootDirectory,
    selection: options.rules,
    signal: options.signal,
  });
  const completedAt = new Date();
  const issues = checks.flatMap((check) => check.issues);
  const hasFailedChecks = checks.some((check) => check.status === "failed");

  return {
    status: hasFailedChecks ? "completed-with-errors" : "completed",
    project: {
      rootDirectory,
    },
    issues,
    checks,
    score: null,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMilliseconds: globalThis.performance.now() - startedMilliseconds,
  };
};
