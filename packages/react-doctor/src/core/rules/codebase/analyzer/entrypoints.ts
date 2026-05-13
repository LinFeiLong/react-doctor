import path from "node:path";
import {
  COMMON_ENTRY_STEMS,
  FRAMEWORK_ROUTE_ENTRY_STEMS,
  SCRIPT_ENTRY_DIRECTORY_NAMES,
  SOURCE_FILE_EXTENSIONS,
  SUPPORT_ENTRY_PATTERNS,
  TEST_ENTRY_MARKERS,
  TYPESCRIPT_DECLARATION_EXTENSIONS,
} from "./constants.js";
import {
  collectManifestEntrySpecifiers,
  collectManifestSupportSpecifiers,
  collectScriptFileEntryPaths,
} from "./manifest.js";
import { getFileStem, matchesAnyGlob, toRelativePath } from "./path-utils.js";
import type {
  CodebaseAnalysisConfig,
  EntryPoint,
  EntryPointRole,
  ProjectFile,
  WorkspaceInfo,
} from "./types.js";
import type { CodebasePluginResult } from "./plugins/types.js";

const toPathLookup = (files: ProjectFile[]): Map<string, ProjectFile> =>
  new Map(files.map((file) => [file.filePath, file]));

const extensionCandidates = (specifier: string): string[] => {
  const extension = path.extname(specifier);
  if (extension) return [specifier];
  return [
    specifier,
    ...SOURCE_FILE_EXTENSIONS.map((item) => `${specifier}${item}`),
    ...SOURCE_FILE_EXTENSIONS.map((item) => path.join(specifier, `index${item}`)),
  ];
};

const SOURCE_EXTENSION_CANDIDATES: Record<string, string[]> = {
  ".cjs": [".cts", ".cjs", ".ts", ".js"],
  ".js": [".ts", ".tsx", ".js", ".jsx"],
  ".jsx": [".tsx", ".jsx"],
  ".mjs": [".mts", ".mjs", ".ts", ".js"],
};

const isUnderDirectory = (filePath: string, directory: string): boolean => {
  const relativePath = path.relative(directory, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
};

const toConfiguredSourceMappedPath = (
  filePath: string,
  workspace: WorkspaceInfo,
): string | null => {
  const sourceMap = [...workspace.sourceMaps]
    .sort((first, second) => second.outputDirectory.length - first.outputDirectory.length)
    .find((item) => isUnderDirectory(filePath, item.outputDirectory));
  if (!sourceMap) return null;
  return path.join(sourceMap.sourceDirectory, path.relative(sourceMap.outputDirectory, filePath));
};

const toConventionalSourceMappedPath = (filePath: string): string | null =>
  filePath.includes(`${path.sep}dist${path.sep}`)
    ? filePath.replace(`${path.sep}dist${path.sep}`, `${path.sep}src${path.sep}`)
    : null;

const toSourceMappedPath = (filePath: string, workspace: WorkspaceInfo): string | null =>
  toConfiguredSourceMappedPath(filePath, workspace) ?? toConventionalSourceMappedPath(filePath);

const toAlternativeSourcePaths = (filePath: string): string[] => {
  const declarationExtension = TYPESCRIPT_DECLARATION_EXTENSIONS.find((extension) =>
    filePath.endsWith(extension),
  );
  if (declarationExtension) {
    const basePath = filePath.slice(0, -declarationExtension.length);
    return [`${basePath}.mts`, `${basePath}.cts`, `${basePath}.ts`, `${basePath}.tsx`];
  }

  const extension = path.extname(filePath);
  const sourceExtensions = SOURCE_EXTENSION_CANDIDATES[extension];
  if (!sourceExtensions) return [];
  const basePath = filePath.slice(0, -extension.length);
  return sourceExtensions.map((sourceExtension) => `${basePath}${sourceExtension}`);
};

const resolveEntrySpecifier = (
  config: CodebaseAnalysisConfig,
  workspace: WorkspaceInfo,
  filesByPath: ReadonlyMap<string, ProjectFile>,
  specifier: string,
): ProjectFile | null => {
  for (const candidate of extensionCandidates(specifier)) {
    const absolutePath = path.resolve(workspace.directory, candidate);
    const sourceMappedPath = toSourceMappedPath(absolutePath, workspace);
    const candidatePaths = new Set([
      absolutePath,
      ...toAlternativeSourcePaths(absolutePath),
      ...(sourceMappedPath
        ? [sourceMappedPath, ...toAlternativeSourcePaths(sourceMappedPath)]
        : []),
    ]);
    for (const candidatePath of candidatePaths) {
      const file = filesByPath.get(candidatePath);
      if (file) return file;
    }
  }
  const rootRelativePath = path.resolve(config.rootDirectory, specifier);
  return filesByPath.get(rootRelativePath) ?? null;
};

const isConventionalRuntimeEntry = (relativePath: string): boolean => {
  const fileStem = getFileStem(relativePath);
  const pathParts = relativePath.split("/");
  const isTopLevelSourceEntry =
    pathParts.length === 1 || (pathParts.length === 2 && pathParts[0] === "src");
  return (
    (COMMON_ENTRY_STEMS.has(fileStem) && isTopLevelSourceEntry) ||
    (FRAMEWORK_ROUTE_ENTRY_STEMS.has(fileStem) &&
      (pathParts.includes("app") || pathParts.includes("pages") || pathParts.includes("routes")))
  );
};

// Top-level files inside conventional CLI script directories
// (`scripts/foo.ts`, `tools/foo.ts`, `internal-tools/foo.ts`, `bin/foo.ts`)
// and `internal-tools/foo/index.{ts,tsx,...}` are SUPPORT entrypoints
// (not runtime). They're invoked directly by `tsx` / `bun` / `node`, and
// their top-level exports aren't a public API — flagging them as
// `unused-export` is noise. Helper files in deeper folders like
// `scripts/_lib/` and `scripts/foo/helpers/` are NOT entries — they become
// reachable through the script files that import them.
const isScriptDirectoryEntry = (relativePath: string): boolean => {
  const pathParts = relativePath.split("/");
  if (pathParts.length < 2) return false;
  if (!SCRIPT_ENTRY_DIRECTORY_NAMES.has(pathParts[0])) return false;
  if (pathParts.length === 2) return true;
  if (pathParts.length !== 3) return false;
  if (pathParts[1].startsWith("_")) return false;
  const fileStem = getFileStem(pathParts[pathParts.length - 1]);
  return fileStem === "index";
};

const isTestEntry = (relativePath: string): boolean =>
  TEST_ENTRY_MARKERS.some((marker) => relativePath.includes(marker));

const isSupportEntry = (relativePath: string): boolean =>
  matchesAnyGlob(relativePath, SUPPORT_ENTRY_PATTERNS);

const hasGlobSyntax = (value: string): boolean => value.includes("*") || value.includes("{");

const stripRelativePrefix = (value: string): string => value.replace(/^\.\//, "");

const JS_LEAF_EXTENSIONS: ReadonlyArray<string> = [".cjs", ".js", ".jsx", ".mjs"];
const DECLARATION_SOURCE_EXTENSIONS: ReadonlyArray<string> = [".mts", ".cts", ".ts", ".tsx"];

const expandSourceExtensionGlob = (pattern: string): string[] => {
  const declarationExtension = TYPESCRIPT_DECLARATION_EXTENSIONS.find((extension) =>
    pattern.endsWith(extension),
  );
  if (declarationExtension) {
    const basePattern = pattern.slice(0, -declarationExtension.length);
    return [`${basePattern}{${DECLARATION_SOURCE_EXTENSIONS.join(",")}}`, pattern];
  }
  const extension = path.extname(pattern);
  if (!JS_LEAF_EXTENSIONS.includes(extension)) return [pattern];
  const basePattern = pattern.slice(0, -extension.length);
  return [`${basePattern}{${SOURCE_FILE_EXTENSIONS.join(",")}}`, pattern];
};

const toConventionalSourceMappedGlobPattern = (pattern: string): string | null =>
  pattern.startsWith("dist/") ? `src/${pattern.slice("dist/".length)}` : null;

const toSourceMappedGlobPatterns = (entry: string, workspace: WorkspaceInfo): string[] => {
  const normalizedEntry = stripRelativePrefix(entry);
  const patterns = new Set(expandSourceExtensionGlob(normalizedEntry));
  const conventionalSourcePattern = toConventionalSourceMappedGlobPattern(normalizedEntry);
  if (conventionalSourcePattern) {
    for (const pattern of expandSourceExtensionGlob(conventionalSourcePattern)) {
      patterns.add(pattern);
    }
  }
  for (const sourceMap of workspace.sourceMaps) {
    const outputDirectory = toRelativePath(workspace.directory, sourceMap.outputDirectory);
    const sourceDirectory = toRelativePath(workspace.directory, sourceMap.sourceDirectory);
    if (!normalizedEntry.startsWith(`${outputDirectory}/`)) continue;
    const sourcePattern = `${sourceDirectory}/${normalizedEntry.slice(outputDirectory.length + 1)}`;
    for (const pattern of expandSourceExtensionGlob(sourcePattern)) {
      patterns.add(pattern);
    }
  }
  return [...patterns];
};

const matchesManifestEntryGlob = (
  workspaceRelativePath: string,
  entry: string,
  workspace: WorkspaceInfo,
): boolean => matchesAnyGlob(workspaceRelativePath, toSourceMappedGlobPatterns(entry, workspace));

const pushEntryPoint = (
  entryPoints: EntryPoint[],
  file: ProjectFile | null,
  role: EntryPointRole,
  source: string,
): void => {
  if (!file) return;
  if (
    entryPoints.some(
      (entryPoint) =>
        entryPoint.fileId === file.id && entryPoint.role === role && entryPoint.source === source,
    )
  )
    return;
  entryPoints.push({ fileId: file.id, role, source });
};

export const discoverEntryPoints = (
  config: CodebaseAnalysisConfig,
  workspaces: WorkspaceInfo[],
  files: ProjectFile[],
  pluginResults: ReadonlyMap<number, CodebasePluginResult>,
): EntryPoint[] => {
  const filesByPath = toPathLookup(files);
  const entryPoints: EntryPoint[] = [];

  for (const workspace of workspaces) {
    const manifestEntries = collectManifestEntrySpecifiers(workspace.manifest);
    for (const entry of manifestEntries.filter((manifestEntry) => !hasGlobSyntax(manifestEntry))) {
      pushEntryPoint(
        entryPoints,
        resolveEntrySpecifier(config, workspace, filesByPath, entry),
        "runtime",
        "package.json",
      );
    }
    for (const entry of collectScriptFileEntryPaths(workspace.manifest)) {
      pushEntryPoint(
        entryPoints,
        resolveEntrySpecifier(config, workspace, filesByPath, entry),
        "support",
        "script-file",
      );
    }
    const manifestSupportEntries = collectManifestSupportSpecifiers(workspace.manifest);
    for (const entry of manifestSupportEntries.filter(
      (supportEntry) => !hasGlobSyntax(supportEntry),
    )) {
      pushEntryPoint(
        entryPoints,
        resolveEntrySpecifier(config, workspace, filesByPath, entry),
        "support",
        "package.json:sideEffects",
      );
    }

    const workspaceFiles = files.filter((file) => file.workspaceId === workspace.id);
    const pluginResult = pluginResults.get(workspace.id);
    for (const file of workspaceFiles) {
      const workspaceRelativePath = toRelativePath(workspace.directory, file.filePath);
      for (const entry of manifestSupportEntries.filter(hasGlobSyntax)) {
        if (matchesAnyGlob(workspaceRelativePath, [stripRelativePrefix(entry)])) {
          pushEntryPoint(entryPoints, file, "support", "package.json:sideEffects");
        }
      }
      for (const entry of manifestEntries.filter(hasGlobSyntax)) {
        if (matchesManifestEntryGlob(workspaceRelativePath, entry, workspace)) {
          pushEntryPoint(entryPoints, file, "runtime", "package.json");
        }
      }
      for (const entryPattern of pluginResult?.entryPatterns ?? []) {
        if (matchesAnyGlob(workspaceRelativePath, [entryPattern.pattern])) {
          pushEntryPoint(entryPoints, file, entryPattern.role, "plugin");
        }
      }
      if (isConventionalRuntimeEntry(workspaceRelativePath)) {
        pushEntryPoint(entryPoints, file, "runtime", "convention");
      }
      if (isScriptDirectoryEntry(workspaceRelativePath)) {
        pushEntryPoint(entryPoints, file, "support", "script-directory");
      }
      if (isTestEntry(workspaceRelativePath)) {
        pushEntryPoint(entryPoints, file, "test", "test-pattern");
      }
      if (isSupportEntry(workspaceRelativePath)) {
        pushEntryPoint(entryPoints, file, "support", "support-pattern");
      }
      if (pluginResult && matchesAnyGlob(workspaceRelativePath, pluginResult.alwaysUsedPatterns)) {
        pushEntryPoint(entryPoints, file, "support", "plugin-always-used");
      }
    }
  }

  return entryPoints.sort(
    (first, second) => first.fileId - second.fileId || first.role.localeCompare(second.role),
  );
};
