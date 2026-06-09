import { SERVER_CONTEXT_PATTERN } from "../../../constants/security-posture.js";
import { isProductionSourcePath } from "./is-production-source-path.js";

export const isClientSourcePath = (relativePath: string): boolean => {
  if (!isProductionSourcePath(relativePath)) return false;
  if (SERVER_CONTEXT_PATTERN.test(relativePath)) return false;
  return true;
};
