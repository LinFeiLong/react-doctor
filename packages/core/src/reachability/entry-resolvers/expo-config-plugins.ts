import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { IGNORED_DIRECTORIES } from "../../project-info/constants.js";
import { toRelativePath } from "../../utils/to-relative-path.js";
import type { ReachabilityEntryResolver, ReachabilityEntryResolverInput } from "../types.js";

// Expo documents local config plugins as string paths in the app config
// `plugins` array: https://docs.expo.dev/config-plugins/plugins/
const EXPO_CONFIG_FILENAMES = new Set([
  "app.config.ts",
  "app.config.mts",
  "app.config.cts",
  "app.config.js",
  "app.config.mjs",
  "app.config.cjs",
  "app.json",
]);
const EXPO_CONFIG_SCAN_MAX_DEPTH = 6;
const EXPO_PLUGIN_RESOLVABLE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".cjs",
  ".cts",
];

const isExpoOrReactNativeProject = ({ project }: ReachabilityEntryResolverInput): boolean =>
  project !== undefined &&
  (project.framework === "expo" ||
    project.framework === "react-native" ||
    project.hasReactNativeWorkspace);

const isLocalExpoPluginPath = (value: string): boolean =>
  (value.startsWith("./") || value.startsWith("../")) &&
  !value.includes("*") &&
  !value.includes("?");

const isFile = (filePath: string): boolean => {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
};

const resolveExpoPluginPath = (configDirectory: string, pluginPath: string): string | undefined => {
  const candidate = path.resolve(configDirectory, pluginPath);
  if (isFile(candidate)) return candidate;

  for (const extension of EXPO_PLUGIN_RESOLVABLE_EXTENSIONS) {
    const withExtension = `${candidate}${extension}`;
    if (isFile(withExtension)) return withExtension;
  }

  for (const extension of EXPO_PLUGIN_RESOLVABLE_EXTENSIONS) {
    const indexCandidate = path.join(candidate, `index${extension}`);
    if (isFile(indexCandidate)) return indexCandidate;
  }

  return undefined;
};

const addExpoPluginEntryPattern = (
  entries: Set<string>,
  rootDirectory: string,
  configDirectory: string,
  pluginPath: string,
): void => {
  if (!isLocalExpoPluginPath(pluginPath)) return;

  const resolvedPath = resolveExpoPluginPath(configDirectory, pluginPath);
  if (!resolvedPath) return;

  const relativePath = toRelativePath(resolvedPath, rootDirectory);
  if (relativePath.startsWith("../") || path.isAbsolute(relativePath)) return;

  entries.add(relativePath);
};

const getPropertyName = (name: ts.PropertyName): string | undefined => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name))
    return name.text;
  return undefined;
};

const collectExpoPluginPathsFromArray = (
  array: ts.ArrayLiteralExpression,
  entries: Set<string>,
  rootDirectory: string,
  configDirectory: string,
): void => {
  for (const element of array.elements) {
    if (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)) {
      addExpoPluginEntryPattern(entries, rootDirectory, configDirectory, element.text);
      continue;
    }

    if (ts.isArrayLiteralExpression(element)) {
      const [pluginName] = element.elements;
      if (
        pluginName &&
        (ts.isStringLiteral(pluginName) || ts.isNoSubstitutionTemplateLiteral(pluginName))
      ) {
        addExpoPluginEntryPattern(entries, rootDirectory, configDirectory, pluginName.text);
      }
    }
  }
};

const collectExpoPluginPathsFromAppConfig = (
  configPath: string,
  entries: Set<string>,
  rootDirectory: string,
): void => {
  const extension = path.extname(configPath);
  const sourceFile = ts.createSourceFile(
    configPath,
    fs.readFileSync(configPath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    extension === ".ts" || extension === ".mts" || extension === ".cts"
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS,
  );
  const configDirectory = path.dirname(configPath);

  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      getPropertyName(node.name) === "plugins" &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      collectExpoPluginPathsFromArray(node.initializer, entries, rootDirectory, configDirectory);
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
};

const collectPluginPathsFromJsonValue = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const pluginPaths: string[] = [];
  for (const plugin of value) {
    if (typeof plugin === "string") {
      pluginPaths.push(plugin);
      continue;
    }

    if (Array.isArray(plugin) && typeof plugin[0] === "string") pluginPaths.push(plugin[0]);
  }

  return pluginPaths;
};

const collectExpoPluginPathsFromAppJson = (
  configPath: string,
  entries: Set<string>,
  rootDirectory: string,
): void => {
  const parsed = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
    expo?: { plugins?: unknown };
    plugins?: unknown;
  };
  const configDirectory = path.dirname(configPath);

  for (const pluginPath of [
    ...collectPluginPathsFromJsonValue(parsed.expo?.plugins),
    ...collectPluginPathsFromJsonValue(parsed.plugins),
  ]) {
    addExpoPluginEntryPattern(entries, rootDirectory, configDirectory, pluginPath);
  }
};

const collectExpoPluginPathsFromConfig = (
  configPath: string,
  entries: Set<string>,
  rootDirectory: string,
): void => {
  try {
    if (path.basename(configPath) === "app.json") {
      collectExpoPluginPathsFromAppJson(configPath, entries, rootDirectory);
      return;
    }

    collectExpoPluginPathsFromAppConfig(configPath, entries, rootDirectory);
  } catch {
    // Invalid or dynamic config should not prevent the normal reachability scan.
  }
};

const discoverExpoConfigPaths = (directory: string, depth = 0): string[] => {
  if (depth > EXPO_CONFIG_SCAN_MAX_DEPTH) return [];

  const configPaths: string[] = [];
  let directoryEntries: fs.Dirent[];
  try {
    directoryEntries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return configPaths;
  }

  for (const entry of directoryEntries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        configPaths.push(...discoverExpoConfigPaths(entryPath, depth + 1));
      }
      continue;
    }

    if (entry.isFile() && EXPO_CONFIG_FILENAMES.has(entry.name)) configPaths.push(entryPath);
  }

  return configPaths;
};

const collectExpoConfigPluginEntryPatterns = (rootDirectory: string): string[] => {
  const entries = new Set<string>();
  for (const configPath of discoverExpoConfigPaths(rootDirectory)) {
    collectExpoPluginPathsFromConfig(configPath, entries, rootDirectory);
  }
  return [...entries];
};

export const expoConfigPluginEntryResolver: ReachabilityEntryResolver = {
  id: "expo-config-plugins",
  isEnabled: isExpoOrReactNativeProject,
  collectEntryPatterns: ({ rootDirectory }) => collectExpoConfigPluginEntryPatterns(rootDirectory),
};
