import { DOTENV_FILE_PATTERN, TEXT_FILE_PATTERN } from "../../../constants/security-posture.js";

export const isProbablyTextFile = (relativePath: string): boolean =>
  TEXT_FILE_PATTERN.test(relativePath) || DOTENV_FILE_PATTERN.test(relativePath);
