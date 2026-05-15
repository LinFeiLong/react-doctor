import path from "node:path";
import type { DependencyInfo, PackageJson } from "@react-doctor/types";
import { EMPTY_DEPENDENCY_INFO, extractDependencyInfo } from "./extract-dependency-info.js";
import { getWorkspacePatterns } from "./get-workspace-patterns.js";
import { parseReactMajor } from "./parse-react-major.js";
import { readPackageJson } from "./read-package-json.js";
import { extractCatalogName, resolveCatalogVersion } from "./resolve-catalog-version.js";
import { resolveWorkspaceDirectories } from "./resolve-workspace-directories.js";

interface DependencyDeclaration {
  catalogReference: string | null;
  hasDeclaration: boolean;
}

interface ResolveWorkspaceDependencyVersionOptions {
  concreteVersion: string | null;
  packageName: string;
  rootDirectory: string;
  rootPackageJson: PackageJson;
  workspaceDirectory: string;
  workspacePackageJson: PackageJson;
}

const getDependencyDeclaration = (
  packageJson: PackageJson,
  packageName: string,
): DependencyDeclaration => {
  const allDependencies = {
    ...packageJson.peerDependencies,
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const dependencyVersion = allDependencies[packageName];
  return {
    catalogReference: extractCatalogName(dependencyVersion ?? "") ?? null,
    hasDeclaration: dependencyVersion !== undefined,
  };
};

const resolveWorkspaceDependencyVersion = ({
  concreteVersion,
  packageName,
  rootDirectory,
  rootPackageJson,
  workspaceDirectory,
  workspacePackageJson,
}: ResolveWorkspaceDependencyVersionOptions): string | null => {
  const dependencyDeclaration = getDependencyDeclaration(workspacePackageJson, packageName);
  if (!dependencyDeclaration.hasDeclaration) return null;

  return (
    concreteVersion ??
    resolveCatalogVersion(
      workspacePackageJson,
      packageName,
      workspaceDirectory,
      dependencyDeclaration.catalogReference,
    ) ??
    resolveCatalogVersion(
      rootPackageJson,
      packageName,
      rootDirectory,
      dependencyDeclaration.catalogReference,
    )
  );
};

const shouldReplaceReactVersion = (currentVersion: string | null, nextVersion: string): boolean => {
  if (!currentVersion) return true;

  const currentMajor = parseReactMajor(currentVersion);
  const nextMajor = parseReactMajor(nextVersion);

  if (currentMajor === null) return nextMajor !== null;
  if (nextMajor === null) return false;
  return nextMajor < currentMajor;
};

export const findReactInWorkspaces = (
  rootDirectory: string,
  packageJson: PackageJson,
): DependencyInfo => {
  const patterns = getWorkspacePatterns(rootDirectory, packageJson);
  const result: DependencyInfo = { ...EMPTY_DEPENDENCY_INFO };

  for (const pattern of patterns) {
    const directories = resolveWorkspaceDirectories(rootDirectory, pattern);

    for (const workspaceDirectory of directories) {
      const workspacePackageJson = readPackageJson(path.join(workspaceDirectory, "package.json"));
      const info = extractDependencyInfo(workspacePackageJson);
      const reactVersion = resolveWorkspaceDependencyVersion({
        concreteVersion: info.reactVersion,
        packageName: "react",
        rootDirectory,
        rootPackageJson: packageJson,
        workspaceDirectory,
        workspacePackageJson,
      });
      const tailwindVersion = resolveWorkspaceDependencyVersion({
        concreteVersion: info.tailwindVersion,
        packageName: "tailwindcss",
        rootDirectory,
        rootPackageJson: packageJson,
        workspaceDirectory,
        workspacePackageJson,
      });

      if (reactVersion && shouldReplaceReactVersion(result.reactVersion, reactVersion)) {
        result.reactVersion = reactVersion;
      }
      if (tailwindVersion && !result.tailwindVersion) {
        result.tailwindVersion = tailwindVersion;
      }
      if (info.framework !== "unknown" && result.framework === "unknown") {
        result.framework = info.framework;
      }

      const resultReactMajor = parseReactMajor(result.reactVersion);
      if (
        result.reactVersion &&
        result.framework !== "unknown" &&
        resultReactMajor !== null &&
        resultReactMajor <= 17
      ) {
        return result;
      }
    }
  }

  return result;
};
