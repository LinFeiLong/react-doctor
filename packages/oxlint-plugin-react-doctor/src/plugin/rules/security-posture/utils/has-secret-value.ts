import { SECRET_VALUE_PATTERNS } from "../../../constants/security.js";

export const hasSecretValue = (content: string): boolean =>
  SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(content));
