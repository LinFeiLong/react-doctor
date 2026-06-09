import { DOTENV_FILE_PATTERN } from "../../../constants/security-posture.js";

export const isRepositorySecretFilePath = (relativePath: string): boolean =>
  DOTENV_FILE_PATTERN.test(relativePath) ||
  /(?:^|\/)\.npmrc$/.test(relativePath) ||
  /(?:^|\/)[^/]*(?:credential|credentials|service-account|serviceAccount|firebase-admin|google-service-account|gcp-service-account)[^/]*\.(?:json|env|pem|key)$/i.test(
    relativePath,
  );
