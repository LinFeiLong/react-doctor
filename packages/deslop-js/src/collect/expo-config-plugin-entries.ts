import { readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import fg from "fast-glob";
import ts from "typescript";
import { EXPO_CONFIG_SCAN_MAX_DEPTH, SOURCE_EXTENSIONS } from "../constants.js";

const EXPO_CONFIG_FILE_GLOBS = ["app.config.{ts,mts,cts,js,mjs,cjs}", "app.json"];
const NESTED_EXPO_CONFIG_FILE_GLOBS = [
  ...EXPO_CONFIG_FILE_GLOBS,
  "**/app.config.{ts,mts,cts,js,mjs,cjs}",
  "**/app.json",
];

const EXPO_REACT_NATIVE_DEPENDENCIES = new Set(["expo", "react-native"]);

const EXPO_PLUGIN_RESOLVABLE_EXTENSIONS = SOURCE_EXTENSIONS.map(
  (sourceExtension) => `.${sourceExtension}`,
);

interface StaticConfigBindings {
  readonly expressions: Map<string, ts.Expression>;
  readonly functions: Map<string, ts.FunctionDeclaration>;
}

interface ExpoPluginCollector {
  readonly filePaths: Set<string>;
  readonly packageNames: Set<string>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isExpoOrReactNativeWorkspace = (dependencies: Record<string, string>): boolean =>
  [...EXPO_REACT_NATIVE_DEPENDENCIES].some((dependencyName) => dependencyName in dependencies);

const isLocalExpoPluginPath = (value: string): boolean =>
  (value.startsWith("./") || value.startsWith("../")) &&
  !value.includes("*") &&
  !value.includes("?");

const isFile = (filePath: string): boolean => {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
};

const resolveExpoPluginPath = (configDirectory: string, pluginPath: string): string | undefined => {
  const candidatePath = resolve(configDirectory, pluginPath);
  if (isFile(candidatePath)) return candidatePath;

  for (const extension of EXPO_PLUGIN_RESOLVABLE_EXTENSIONS) {
    const candidatePathWithExtension = `${candidatePath}${extension}`;
    if (isFile(candidatePathWithExtension)) return candidatePathWithExtension;
  }

  for (const extension of EXPO_PLUGIN_RESOLVABLE_EXTENSIONS) {
    const indexCandidatePath = join(candidatePath, `index${extension}`);
    if (isFile(indexCandidatePath)) return indexCandidatePath;
  }

  return undefined;
};

const isPackagePluginName = (value: string): boolean =>
  value.length > 0 &&
  !value.startsWith("./") &&
  !value.startsWith("../") &&
  !value.startsWith("/") &&
  !value.includes("*") &&
  !value.includes("?");

const addExpoPluginEntry = (
  collector: ExpoPluginCollector,
  rootDirectory: string,
  configDirectory: string,
  pluginPath: string,
): void => {
  if (!isLocalExpoPluginPath(pluginPath)) {
    if (isPackagePluginName(pluginPath)) collector.packageNames.add(pluginPath);
    return;
  }

  const resolvedPath = resolveExpoPluginPath(configDirectory, pluginPath);
  if (!resolvedPath) return;

  const relativePath = relative(rootDirectory, resolvedPath);
  if (relativePath !== "" && (relativePath.startsWith("..") || isAbsolute(relativePath))) return;

  collector.filePaths.add(resolvedPath);
};

const getPropertyName = (name: ts.PropertyName): string | undefined => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name))
    return name.text;
  return undefined;
};

const unwrapExpression = (expression: ts.Expression): ts.Expression => {
  let currentExpression = expression;
  while (ts.isParenthesizedExpression(currentExpression)) {
    currentExpression = currentExpression.expression;
  }
  return currentExpression;
};

const collectExpoPluginPathsFromArray = (
  array: ts.ArrayLiteralExpression,
  collector: ExpoPluginCollector,
  rootDirectory: string,
  configDirectory: string,
): void => {
  for (const element of array.elements) {
    if (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)) {
      addExpoPluginEntry(collector, rootDirectory, configDirectory, element.text);
      continue;
    }

    if (ts.isArrayLiteralExpression(element)) {
      const [pluginName] = element.elements;
      if (
        pluginName &&
        (ts.isStringLiteral(pluginName) || ts.isNoSubstitutionTemplateLiteral(pluginName))
      ) {
        addExpoPluginEntry(collector, rootDirectory, configDirectory, pluginName.text);
      }
    }
  }
};

const collectExpoPluginPathsFromConfigObject = (
  objectLiteral: ts.ObjectLiteralExpression,
  collector: ExpoPluginCollector,
  rootDirectory: string,
  configDirectory: string,
): void => {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const propertyName = getPropertyName(property.name);

    if (propertyName === "plugins" && ts.isArrayLiteralExpression(property.initializer)) {
      collectExpoPluginPathsFromArray(
        property.initializer,
        collector,
        rootDirectory,
        configDirectory,
      );
    }

    // app.config.js may wrap the config under an `expo` key (`{ expo: { plugins } }`),
    // the same shape as app.json. Without descending into it, plugins nested under
    // `expo` are never visited and every plugin reads as unused.
    if (propertyName === "expo" && ts.isObjectLiteralExpression(property.initializer)) {
      collectExpoPluginPathsFromConfigObject(
        property.initializer,
        collector,
        rootDirectory,
        configDirectory,
      );
    }
  }
};

const collectReturnedExpoConfigPluginPaths = (
  body: ts.ConciseBody,
  collector: ExpoPluginCollector,
  rootDirectory: string,
  configDirectory: string,
): void => {
  if (!ts.isBlock(body)) {
    const expression = unwrapExpression(body);
    if (ts.isObjectLiteralExpression(expression)) {
      collectExpoPluginPathsFromConfigObject(expression, collector, rootDirectory, configDirectory);
    }
    return;
  }

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node))
      return;

    if (ts.isReturnStatement(node) && node.expression) {
      const expression = unwrapExpression(node.expression);
      if (ts.isObjectLiteralExpression(expression)) {
        collectExpoPluginPathsFromConfigObject(expression, collector, rootDirectory, configDirectory);
      }
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(body);
};

const collectExpoPluginPathsFromConfigExpression = (
  expression: ts.Expression,
  collector: ExpoPluginCollector,
  rootDirectory: string,
  configDirectory: string,
  bindings: StaticConfigBindings,
  seenIdentifiers = new Set<string>(),
): void => {
  const configExpression = unwrapExpression(expression);
  if (ts.isObjectLiteralExpression(configExpression)) {
    collectExpoPluginPathsFromConfigObject(
      configExpression,
      collector,
      rootDirectory,
      configDirectory,
    );
    return;
  }

  if (ts.isIdentifier(configExpression)) {
    if (seenIdentifiers.has(configExpression.text)) return;

    seenIdentifiers.add(configExpression.text);
    const boundExpression = bindings.expressions.get(configExpression.text);
    if (boundExpression) {
      collectExpoPluginPathsFromConfigExpression(
        boundExpression,
        collector,
        rootDirectory,
        configDirectory,
        bindings,
        seenIdentifiers,
      );
      return;
    }

    const boundFunction = bindings.functions.get(configExpression.text);
    if (boundFunction?.body) {
      collectReturnedExpoConfigPluginPaths(
        boundFunction.body,
        collector,
        rootDirectory,
        configDirectory,
      );
    }
    return;
  }

  if (ts.isArrowFunction(configExpression)) {
    collectReturnedExpoConfigPluginPaths(
      configExpression.body,
      collector,
      rootDirectory,
      configDirectory,
    );
    return;
  }

  if (ts.isFunctionExpression(configExpression) && configExpression.body) {
    collectReturnedExpoConfigPluginPaths(
      configExpression.body,
      collector,
      rootDirectory,
      configDirectory,
    );
  }
};

const hasDefaultExportModifier = (node: ts.Node): boolean =>
  Boolean(
    ts.canHaveModifiers(node) &&
    ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword),
  );

const isModuleExportsAssignmentTarget = (node: ts.Node): boolean =>
  ts.isPropertyAccessExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === "module" &&
  node.name.text === "exports";

const collectStaticConfigBindings = (sourceFile: ts.SourceFile): StaticConfigBindings => {
  const expressions = new Map<string, ts.Expression>();
  const functions = new Map<string, ts.FunctionDeclaration>();

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          expressions.set(declaration.name.text, declaration.initializer);
        }
      }
      continue;
    }

    if (ts.isFunctionDeclaration(statement) && statement.name) {
      functions.set(statement.name.text, statement);
    }
  }

  return { expressions, functions };
};

const collectExpoPluginPathsFromAppConfig = (
  configPath: string,
  collector: ExpoPluginCollector,
  rootDirectory: string,
): void => {
  const extension = extname(configPath);
  const sourceFile = ts.createSourceFile(
    configPath,
    readFileSync(configPath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    extension === ".ts" || extension === ".mts" || extension === ".cts"
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS,
  );
  const configDirectory = dirname(configPath);
  const bindings = collectStaticConfigBindings(sourceFile);

  const visit = (node: ts.Node): void => {
    if (ts.isExportAssignment(node)) {
      collectExpoPluginPathsFromConfigExpression(
        node.expression,
        collector,
        rootDirectory,
        configDirectory,
        bindings,
      );
      return;
    }

    if (ts.isFunctionDeclaration(node) && hasDefaultExportModifier(node) && node.body) {
      collectReturnedExpoConfigPluginPaths(node.body, collector, rootDirectory, configDirectory);
      return;
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      isModuleExportsAssignmentTarget(node.left)
    ) {
      collectExpoPluginPathsFromConfigExpression(
        node.right,
        collector,
        rootDirectory,
        configDirectory,
        bindings,
      );
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
  collector: ExpoPluginCollector,
  rootDirectory: string,
): void => {
  const parsedJson: unknown = JSON.parse(readFileSync(configPath, "utf8"));
  const configDirectory = dirname(configPath);
  if (!isRecord(parsedJson)) return;

  const expoConfig = parsedJson.expo;
  const expoPluginPaths = isRecord(expoConfig)
    ? collectPluginPathsFromJsonValue(expoConfig.plugins)
    : [];

  for (const pluginPath of [
    ...expoPluginPaths,
    ...collectPluginPathsFromJsonValue(parsedJson.plugins),
  ]) {
    addExpoPluginEntry(collector, rootDirectory, configDirectory, pluginPath);
  }
};

const collectExpoPluginPathsFromConfig = (
  configPath: string,
  collector: ExpoPluginCollector,
  rootDirectory: string,
): void => {
  try {
    if (basename(configPath) === "app.json") {
      collectExpoPluginPathsFromAppJson(configPath, collector, rootDirectory);
      return;
    }

    collectExpoPluginPathsFromAppConfig(configPath, collector, rootDirectory);
  } catch {}
};

const collectExpoConfigPlugins = (
  directory: string,
  dependencies: Record<string, string>,
  rootDirectory: string,
  includeNestedConfigs: boolean,
): ExpoPluginCollector => {
  const collector: ExpoPluginCollector = {
    filePaths: new Set<string>(),
    packageNames: new Set<string>(),
  };
  if (!isExpoOrReactNativeWorkspace(dependencies)) return collector;

  const configPaths = fg.sync(
    includeNestedConfigs ? NESTED_EXPO_CONFIG_FILE_GLOBS : EXPO_CONFIG_FILE_GLOBS,
    {
      cwd: directory,
      absolute: true,
      onlyFiles: true,
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
      deep: EXPO_CONFIG_SCAN_MAX_DEPTH,
    },
  );

  for (const configPath of configPaths) {
    collectExpoPluginPathsFromConfig(configPath, collector, rootDirectory);
  }

  return collector;
};

export const extractExpoConfigPluginEntries = (
  directory: string,
  dependencies: Record<string, string>,
  rootDirectory = directory,
  includeNestedConfigs = true,
): string[] => [
  ...collectExpoConfigPlugins(directory, dependencies, rootDirectory, includeNestedConfigs).filePaths,
];

export const extractExpoConfigPluginPackageNames = (
  directory: string,
  dependencies: Record<string, string>,
  rootDirectory = directory,
  includeNestedConfigs = true,
): string[] => [
  ...collectExpoConfigPlugins(directory, dependencies, rootDirectory, includeNestedConfigs).packageNames,
];
