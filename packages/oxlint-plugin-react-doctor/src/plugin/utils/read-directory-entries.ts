import * as fs from "node:fs";

const IGNORABLE_READDIR_ERROR_CODES = new Set([
  "EACCES",
  "EPERM",
  "ENOENT",
  "ENOTDIR",
  "EINVAL",
  "ELOOP",
  "ENAMETOOLONG",
]);

const isIgnorableReaddirError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  if (!("code" in error)) return false;
  const errorCode = error.code;
  return typeof errorCode === "string" && IGNORABLE_READDIR_ERROR_CODES.has(errorCode);
};

export const readDirectoryEntries = (directoryPath: string): fs.Dirent[] => {
  try {
    return fs.readdirSync(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (isIgnorableReaddirError(error)) return [];
    throw error;
  }
};
