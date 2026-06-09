import { SCRIPT_SOURCE_FILE_PATTERN } from "../../../constants/security-posture.js";
import { isProductionFilePath } from "./is-production-file-path.js";

export const isProductionScriptSourcePath = (relativePath: string): boolean =>
  isProductionFilePath(relativePath, SCRIPT_SOURCE_FILE_PATTERN);
