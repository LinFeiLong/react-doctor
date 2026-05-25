import {
  getPackageJsonPath,
  isRecord,
  readPackageJson,
  writeJsonFile,
} from "./git-hook-shared.js";

export const DOCTOR_SCRIPT_NAME = "doctor";
export const DOCTOR_SCRIPT_COMMAND = "react-doctor";

export interface InstallDoctorScriptOptions {
  readonly projectRoot: string;
}

export interface InstallDoctorScriptResult {
  readonly packageJsonPath: string;
  readonly status: "created" | "existing" | "skipped";
  readonly reason?: "missing-or-invalid-package-json" | "invalid-scripts";
}

export const hasDoctorScript = (projectRoot: string): boolean => {
  const packageJson = readPackageJson(projectRoot);
  if (!isRecord(packageJson)) return false;
  const scripts = packageJson.scripts;
  return isRecord(scripts) && Object.hasOwn(scripts, DOCTOR_SCRIPT_NAME);
};

export const installDoctorScript = (
  options: InstallDoctorScriptOptions,
): InstallDoctorScriptResult => {
  const packageJsonPath = getPackageJsonPath(options.projectRoot);
  const packageJson = readPackageJson(options.projectRoot);

  if (!isRecord(packageJson)) {
    return {
      packageJsonPath,
      status: "skipped",
      reason: "missing-or-invalid-package-json",
    };
  }

  const scripts = packageJson.scripts;
  if (isRecord(scripts) && Object.hasOwn(scripts, DOCTOR_SCRIPT_NAME)) {
    return { packageJsonPath, status: "existing" };
  }

  if (scripts !== undefined && !isRecord(scripts)) {
    return { packageJsonPath, status: "skipped", reason: "invalid-scripts" };
  }

  writeJsonFile(packageJsonPath, {
    ...packageJson,
    scripts: {
      ...(isRecord(scripts) ? scripts : {}),
      [DOCTOR_SCRIPT_NAME]: DOCTOR_SCRIPT_COMMAND,
    },
  });

  return { packageJsonPath, status: "created" };
};
