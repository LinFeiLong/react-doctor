import { inspectReactProjectCore } from "../core/inspect-react-project.js";
import type { InspectReactProjectOptions, ReactDoctorResult } from "../core/types.js";

export interface CreateReactDoctorOptions {
  rootDirectory?: string;
  includePaths?: string[];
  excludePatterns?: string[];
  rules?: InspectReactProjectOptions["rules"];
}

export interface ReactDoctor {
  inspect: (options?: InspectReactProjectOptions) => Promise<ReactDoctorResult>;
}

const mergeInspectOptions = (
  defaults: CreateReactDoctorOptions,
  options: InspectReactProjectOptions,
): InspectReactProjectOptions => ({
  ...defaults,
  ...options,
  rootDirectory: options.rootDirectory ?? defaults.rootDirectory,
});

export const createReactDoctor = (options: CreateReactDoctorOptions = {}): ReactDoctor => ({
  inspect: (runOptions: InspectReactProjectOptions = {}) =>
    inspectReactProjectCore(mergeInspectOptions(options, runOptions)),
});

export const inspectReactProject = (
  options: InspectReactProjectOptions = {},
): Promise<ReactDoctorResult> => createReactDoctor(options).inspect();
