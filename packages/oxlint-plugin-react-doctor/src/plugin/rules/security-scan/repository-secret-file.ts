import { TEST_CONTEXT_PATTERN } from "../../constants/security-scan.js";
import { SECRET_VALUE_PATTERNS } from "../../constants/security.js";
import { defineScanRule } from "../../utils/define-scan-rule.js";
import {
  findSuspiciousPublicEnvSecretNamePattern,
  hasSuspiciousPublicEnvSecretName,
} from "./utils/find-suspicious-public-env-secret-name.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { hasSecretValue } from "./utils/has-secret-value.js";
import { isRepositorySecretFilePath } from "./utils/is-repository-secret-file-path.js";

const isRepositorySecretExamplePath = (relativePath: string): boolean =>
  /(?:^|\/)\.env\.example$|(?:^|\/)[^/]*(?:example|sample|template)[^/]*\.(?:env|json|pem|key)$/i.test(
    relativePath,
  );

export const repositorySecretFile = defineScanRule({
  id: "repository-secret-file",
  title: "Secret file checked into repository",
  severity: "error",
  recommendation:
    "Remove committed env files, service-account credentials, npm auth tokens, and webhook URLs; rotate exposed values and keep only redacted examples in source.",
  scan: (file) => {
    if (!isRepositorySecretFilePath(file.relativePath)) return [];
    if (isRepositorySecretExamplePath(file.relativePath)) return [];
    if (TEST_CONTEXT_PATTERN.test(file.relativePath)) return [];
    if (!hasSecretValue(file.content) && !hasSuspiciousPublicEnvSecretName(file.content)) {
      return [];
    }

    const pattern =
      SECRET_VALUE_PATTERNS.find((candidate) => candidate.test(file.content)) ??
      findSuspiciousPublicEnvSecretNamePattern(file.content);
    const location = getMatchLocation(file.content, pattern);
    return [
      {
        message: "A repository credential/config file contains secret-looking values.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
