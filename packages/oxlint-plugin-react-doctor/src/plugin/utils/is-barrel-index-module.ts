import fs from "node:fs";
import path from "node:path";

const INDEX_MODULE_FILE_PATTERN = /^index\.(?:[cm]?[jt]sx?|mjs)$/;
const BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT_PATTERN = /^\s*\/\/.*$/gm;
const BINDING_IMPORT_DECLARATION_PATTERN =
  /^\s*import\s+(?!["'])(?:type\s+)?[^;]*?\s+from\s+["'][^"']+["']\s*;?\s*(?:(?:\/\/[^\n]*)?\s*)/gm;
const BARREL_REEXPORT_DECLARATION_PATTERN =
  /^\s*export\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[\s\S]*?\})\s+from\s+["'][^"']+["']\s*;?\s*(?:(?:\/\/[^\n]*)?\s*)/gm;
const LOCAL_EXPORT_SPECIFIER_DECLARATION_PATTERN =
  /^\s*export\s+(?:type\s+)?\{[\s\S]*?\}\s*;?\s*(?:(?:\/\/[^\n]*)?\s*)/gm;

const barrelIndexModuleCache = new Map<string, boolean>();

const stripComments = (sourceText: string): string =>
  sourceText.replace(BLOCK_COMMENT_PATTERN, "").replace(LINE_COMMENT_PATTERN, "");

const isIndexModuleFilePath = (filePath: string): boolean =>
  INDEX_MODULE_FILE_PATTERN.test(path.basename(filePath));

const isPureBarrelModule = (sourceText: string): boolean => {
  const strippedSource = stripComments(sourceText).trim();
  if (!strippedSource) return false;

  const withoutBarrelDeclarations = strippedSource
    .replace(BINDING_IMPORT_DECLARATION_PATTERN, "")
    .replace(BARREL_REEXPORT_DECLARATION_PATTERN, "")
    .replace(LOCAL_EXPORT_SPECIFIER_DECLARATION_PATTERN, "")
    .trim();

  return withoutBarrelDeclarations.length === 0;
};

export const isBarrelIndexModule = (filePath: string): boolean => {
  if (!isIndexModuleFilePath(filePath)) return false;

  const cachedResult = barrelIndexModuleCache.get(filePath);
  if (cachedResult !== undefined) return cachedResult;

  let isBarrel = false;
  try {
    isBarrel = isPureBarrelModule(fs.readFileSync(filePath, "utf8"));
  } catch {
    isBarrel = false;
  }

  barrelIndexModuleCache.set(filePath, isBarrel);
  return isBarrel;
};
