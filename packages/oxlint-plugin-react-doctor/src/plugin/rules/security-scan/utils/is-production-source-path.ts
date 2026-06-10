import { SOURCE_FILE_PATTERN } from "../../../constants/security-scan.js";
import { isProductionFilePath } from "./is-production-file-path.js";

export const isProductionSourcePath = (relativePath: string): boolean => {
  return isProductionFilePath(relativePath, SOURCE_FILE_PATTERN);
};
