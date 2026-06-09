import {
  DOCUMENTATION_CONTEXT_PATTERN,
  GENERATED_SOURCE_CONTEXT_PATTERN,
  TEST_CONTEXT_PATTERN,
} from "../../../constants/security-posture.js";

export const isProductionFilePath = (relativePath: string, sourceFilePattern: RegExp): boolean => {
  if (!sourceFilePattern.test(relativePath)) return false;
  if (TEST_CONTEXT_PATTERN.test(relativePath)) return false;
  if (DOCUMENTATION_CONTEXT_PATTERN.test(relativePath)) return false;
  if (GENERATED_SOURCE_CONTEXT_PATTERN.test(relativePath)) return false;
  return true;
};
