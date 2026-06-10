import { defineScanRule } from "../../utils/define-scan-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isSqlPath } from "./utils/is-sql-path.js";

export const supabaseRlsPolicyRisk = defineScanRule({
  id: "supabase-rls-policy-risk",
  title: "Permissive Supabase RLS policy",
  severity: "error",
  recommendation:
    "Keep public-read policies explicit, but gate inserts, updates, deletes, and service-role bypasses behind `auth.uid()` plus trusted tenant membership.",
  scan: (file) => {
    if (!isSqlPath(file.relativePath)) return [];

    const disabledRlsPattern = /disable\s+row\s+level\s+security/i;
    const serviceRolePolicyPattern =
      /create\s+policy[\s\S]{0,700}auth\.role\(\)\s*=\s*["']service_role["']/i;
    const openWritePolicyPattern =
      /create\s+policy[\s\S]{0,700}\bfor\s+(?:all|insert|update|delete)\b[\s\S]{0,500}\b(?:using|with\s+check)\s*\(\s*true\s*\)/i;
    const implicitOpenPolicyPattern =
      /create\s+policy(?:(?!\bfor\s+select\b)[\s\S]){0,700}\b(?:using|with\s+check)\s*\(\s*true\s*\)/i;
    const pattern =
      [
        disabledRlsPattern,
        serviceRolePolicyPattern,
        openWritePolicyPattern,
        implicitOpenPolicyPattern,
      ].find((candidate) => candidate.test(file.content)) ?? null;

    if (pattern === null) return [];

    const location = getMatchLocation(file.content, pattern);
    return [
      {
        message:
          "Supabase policy SQL disables RLS, permits writes broadly, or references a service-role bypass.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
