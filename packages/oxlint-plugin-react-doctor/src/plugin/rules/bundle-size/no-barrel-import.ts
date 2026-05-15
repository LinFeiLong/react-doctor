import fs from "node:fs";
import path from "node:path";
import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";
import type { RuleContext } from "../../utils/rule-context.js";
import type { EsTreeNodeOfType } from "../../utils/es-tree-node-of-type.js";

const MODULE_FILE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"];
const INDEX_MODULE_FILE_PATTERN = /^index\.(?:[cm]?[jt]sx?|mjs)$/;
const BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT_PATTERN = /^\s*\/\/.*$/gm;
const BARREL_REEXPORT_DECLARATION_PATTERN =
  /^\s*export\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[\s\S]*?\})\s+from\s+["'][^"']+["']\s*;?\s*/gm;

const barrelIndexModuleCache = new Map<string, boolean>();

const getExistingFilePath = (filePath: string): string | null => {
  try {
    return fs.statSync(filePath).isFile() ? filePath : null;
  } catch {
    return null;
  }
};

const getModuleFilePathCandidates = (modulePath: string): string[] => {
  const extension = path.extname(modulePath);
  if (!extension) {
    return MODULE_FILE_EXTENSIONS.map((moduleExtension) => `${modulePath}${moduleExtension}`);
  }

  const modulePathWithoutExtension = modulePath.slice(0, -extension.length);
  if (extension === ".js") {
    return [
      modulePath,
      `${modulePathWithoutExtension}.ts`,
      `${modulePathWithoutExtension}.tsx`,
      `${modulePathWithoutExtension}.jsx`,
    ];
  }
  if (extension === ".jsx") return [modulePath, `${modulePathWithoutExtension}.tsx`];
  if (extension === ".mjs") return [modulePath, `${modulePathWithoutExtension}.mts`];
  if (extension === ".cjs") return [modulePath, `${modulePathWithoutExtension}.cts`];

  return [modulePath];
};

const resolveModuleFilePath = (modulePath: string): string | null => {
  const exactFilePath = getExistingFilePath(modulePath);
  if (exactFilePath) return exactFilePath;

  for (const candidateFilePath of getModuleFilePathCandidates(modulePath)) {
    const filePath = getExistingFilePath(candidateFilePath);
    if (filePath) return filePath;
  }

  return null;
};

const resolveRelativeImportPath = (filename: string, source: string): string | null => {
  const importPath = path.resolve(path.dirname(filename), source);
  const directFilePath = resolveModuleFilePath(importPath);
  if (directFilePath) return directFilePath;

  return resolveModuleFilePath(path.join(importPath, "index"));
};

const isIndexModuleFilePath = (filePath: string): boolean =>
  INDEX_MODULE_FILE_PATTERN.test(path.basename(filePath));

const stripComments = (sourceText: string): string =>
  sourceText.replace(BLOCK_COMMENT_PATTERN, "").replace(LINE_COMMENT_PATTERN, "");

const isPureReExportBarrel = (sourceText: string): boolean => {
  const strippedSource = stripComments(sourceText).trim();
  if (!strippedSource) return false;

  const withoutReExports = strippedSource.replace(BARREL_REEXPORT_DECLARATION_PATTERN, "").trim();
  return withoutReExports.length === 0;
};

const isBarrelIndexModule = (filePath: string): boolean => {
  const cachedResult = barrelIndexModuleCache.get(filePath);
  if (cachedResult !== undefined) return cachedResult;

  let isBarrel = false;
  try {
    isBarrel = isPureReExportBarrel(fs.readFileSync(filePath, "utf8"));
  } catch {
    isBarrel = false;
  }

  barrelIndexModuleCache.set(filePath, isBarrel);
  return isBarrel;
};

export const noBarrelImport = defineRule<Rule>({
  id: "no-barrel-import",
  severity: "warn",
  recommendation:
    "Import from the direct path: `import { Button } from './components/Button'` instead of `./components`",
  create: (context: RuleContext) => {
    let didReportForFile = false;

    return {
      ImportDeclaration(node: EsTreeNodeOfType<"ImportDeclaration">) {
        if (didReportForFile) return;

        const source = node.source?.value;
        if (typeof source !== "string" || !source.startsWith(".")) return;

        const filename = context.getFilename?.() ?? "";
        if (!filename) return;

        const resolvedImportPath = resolveRelativeImportPath(filename, source);
        if (
          resolvedImportPath &&
          isIndexModuleFilePath(resolvedImportPath) &&
          isBarrelIndexModule(resolvedImportPath)
        ) {
          didReportForFile = true;
          context.report({
            node,
            message:
              "Import from barrel/index file — import directly from the source module for better tree-shaking",
          });
        }
      },
    };
  },
});
