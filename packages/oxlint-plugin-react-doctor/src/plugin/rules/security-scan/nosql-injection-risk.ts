import { DATABASE_SOURCE_FILE_PATTERN } from "../../constants/security-scan.js";
import { defineRule } from "../../utils/define-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isProductionFilePath } from "./utils/is-production-file-path.js";

const NOSQL_INJECTION_RISK_PATTERN =
  /\$where\s*['"]?\s*:\s*(?:f?['"`][^'"`]{0,200}\$\{|function|f['"])|\.find\s*\(\s*JSON\.parse\s*\(\s*(?:req|request)\.|\.aggregate\s*\(\s*\[?\s*\{[^}]{0,400}\$where|\bnew\s+RegExp\s*\(\s*(?:req|request)\.|\$regex['"]?\s*:\s*(?:req|request)\./i;

const isProductionDatabaseSourcePath = (relativePath: string): boolean =>
  isProductionFilePath(relativePath, DATABASE_SOURCE_FILE_PATTERN);

export const nosqlInjectionRisk = defineRule({
  id: "nosql-injection-risk",
  title: "NoSQL query accepts operator-shaped input",
  severity: "warn",
  recommendation:
    "Coerce scalar fields before querying, reject operator keys from client input, and avoid `$where` or request-derived regexes.",
  scan: (file) => {
    if (!isProductionDatabaseSourcePath(file.relativePath)) return [];
    if (!NOSQL_INJECTION_RISK_PATTERN.test(file.content)) return [];
    const location = getMatchLocation(file.content, NOSQL_INJECTION_RISK_PATTERN);
    return [
      {
        message:
          "Code appears to pass raw JSON, regex, or `$where` style input into a NoSQL query.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
