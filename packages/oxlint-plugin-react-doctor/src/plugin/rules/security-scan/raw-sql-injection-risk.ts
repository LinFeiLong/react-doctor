import { defineScanRule } from "../../utils/define-scan-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isProductionScriptSourcePath } from "./utils/is-production-script-source-path.js";

const RAW_SQL_RISK_PATTERNS = [
  /\$queryRawUnsafe\s*\(/,
  /\$executeRawUnsafe\s*\(/,
  /\bPrisma\.raw\s*\(/,
  /\bsql\.\s*(?:raw|unsafe)\s*\(/,
  /\b(?:client|pool|conn)\.query\s*\(\s*['"`]\s*(?:SELECT|INSERT|UPDATE|DELETE)\b[^)]{0,400}\$\{/i,
  /\.query\s*\(\s*['"`][^'"`]{0,200}['"`]\s*\+/,
  /\.whereRaw\s*\(|\.orderByRaw\s*\(|\.havingRaw\s*\(/,
  /\bcursor\.execute\s*\(\s*f['"]/,
  /\bcursor\.execute\s*\(\s*(?:"[^"]{0,400}"|'[^']{0,400}')\s*(?:%|\.format\s*\(|\+)/,
  /\b(?:engine|session)\.execute\s*\(\s*(?:text\s*\(\s*)?f['"]/,
  /\$[\w]+->(?:query|exec|prepare|executeQuery|executeStatement|createQuery|createNativeQuery)\s*\(\s*(?:"[^"]{0,400}"|'[^']{0,400}')\s*\.\s*\$/,
  /mysqli_query\s*\(\s*[^,]+,\s*(?:"[^"]{0,400}"|'[^']{0,400}')\s*\.\s*\$/,
] as const;

export const rawSqlInjectionRisk = defineScanRule({
  id: "raw-sql-injection-risk",
  title: "Raw SQL built outside parameter binding",
  severity: "warn",
  recommendation:
    "Keep user input in driver parameters or ORM bind variables. Avoid unsafe/raw SQL helpers and string interpolation for queries.",
  scan: (file) => {
    if (!isProductionScriptSourcePath(file.relativePath)) return [];
    const pattern = RAW_SQL_RISK_PATTERNS.find((candidate) => candidate.test(file.content));
    if (pattern === undefined) return [];
    const location = getMatchLocation(file.content, pattern);
    return [
      {
        message:
          "Code uses a raw SQL escape hatch or string-built query shape that can bypass parameter binding.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
