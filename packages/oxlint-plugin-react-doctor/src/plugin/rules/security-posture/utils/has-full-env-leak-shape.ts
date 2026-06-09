import {
  FULL_ENV_LEAK_CONTEXT_PATTERN,
  FULL_ENV_LEAK_SECRET_NAME_PATTERN,
} from "../../../constants/security.js";

export const hasFullEnvLeakShape = (content: string): boolean =>
  FULL_ENV_LEAK_CONTEXT_PATTERN.test(content) && FULL_ENV_LEAK_SECRET_NAME_PATTERN.test(content);
