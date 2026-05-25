import {
  getPackageJsonPath,
  isRecord,
  readPackageJson,
  writeJsonFile,
} from "./git-hook-shared.js";
import { VERSION } from "./version.js";

export const DOCTOR_SCRIPT_NAME = "doctor";
export const DOCTOR_SCRIPT_COMMAND = "react-doctor";
export const DOCTOR_PACKAGE_NAME = "react-doctor";

export interface InstallDoctorScriptOptions {
  readonly projectRoot: string;
}

export interface InstallDoctorScriptResult {
  readonly packageJsonPath: string;
  readonly scriptStatus: "created" | "existing" | "skipped";
  readonly dependencyStatus: "created" | "existing" | "skipped";
  readonly scriptReason?: "missing-or-invalid-package-json" | "invalid-scripts";
  readonly dependencyReason?: "missing-or-invalid-package-json" | "invalid-dev-dependencies";
}

const DEPENDENCY_FIELD_NAMES: readonly string[] = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const getDoctorDependencyVersion = (): string => (VERSION === "0.0.0" ? "latest" : `^${VERSION}`);

export const hasDoctorScript = (projectRoot: string): boolean => {
  const packageJson = readPackageJson(projectRoot);
  if (!isRecord(packageJson)) return false;
  const scripts = packageJson.scripts;
  return isRecord(scripts) && Object.hasOwn(scripts, DOCTOR_SCRIPT_NAME);
};

const hasDoctorDependency = (packageJson: Record<string, unknown>): boolean =>
  DEPENDENCY_FIELD_NAMES.some((fieldName) => {
    const dependencies = packageJson[fieldName];
    return isRecord(dependencies) && Object.hasOwn(dependencies, DOCTOR_PACKAGE_NAME);
  });

export const installDoctorScript = (
  options: InstallDoctorScriptOptions,
): InstallDoctorScriptResult => {
  const packageJsonPath = getPackageJsonPath(options.projectRoot);
  const packageJson = readPackageJson(options.projectRoot);

  if (!isRecord(packageJson)) {
    return {
      packageJsonPath,
      scriptStatus: "skipped",
      dependencyStatus: "skipped",
      scriptReason: "missing-or-invalid-package-json",
      dependencyReason: "missing-or-invalid-package-json",
    };
  }

  const scripts = packageJson.scripts;
  const devDependencies = packageJson.devDependencies;
  const scriptStatus =
    isRecord(scripts) && Object.hasOwn(scripts, DOCTOR_SCRIPT_NAME)
      ? "existing"
      : scripts !== undefined && !isRecord(scripts)
        ? "skipped"
        : "created";
  const dependencyStatus = hasDoctorDependency(packageJson)
    ? "existing"
    : devDependencies !== undefined && !isRecord(devDependencies)
      ? "skipped"
      : "created";
  const didCreateScript = scriptStatus === "created";
  const didCreateDependency = dependencyStatus === "created";

  if (didCreateScript || didCreateDependency) {
    writeJsonFile(packageJsonPath, {
      ...packageJson,
      ...(didCreateScript
        ? {
            scripts: {
              ...(isRecord(scripts) ? scripts : {}),
              [DOCTOR_SCRIPT_NAME]: DOCTOR_SCRIPT_COMMAND,
            },
          }
        : {}),
      ...(didCreateDependency
        ? {
            devDependencies: {
              ...(isRecord(devDependencies) ? devDependencies : {}),
              [DOCTOR_PACKAGE_NAME]: getDoctorDependencyVersion(),
            },
          }
        : {}),
    });
  }

  return {
    packageJsonPath,
    scriptStatus,
    dependencyStatus,
    ...(scriptStatus === "skipped" ? { scriptReason: "invalid-scripts" } : {}),
    ...(dependencyStatus === "skipped" ? { dependencyReason: "invalid-dev-dependencies" } : {}),
  };
};
