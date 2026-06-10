import { defineScanRule } from "../../utils/define-scan-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isClientSourcePath } from "./utils/is-client-source-path.js";

const SENSITIVE_AUTH_FIELD_PATTERN =
  /\b(?:ownerId|ownerID|creatorId|creatorID|userId|userID|uid|providerId|providerID|orgId|orgID|tenantId|tenantID|teamId|teamID|workspaceId|workspaceID|ghostOrg|role|roles|isAdmin|admin)\b/;

const SUPABASE_CLIENT_AUTHZ_WRITE_PATTERN =
  /\b(?:supabase\b|\.from\s*\(\s*["'][^"']+["']\s*\))[\s\S]{0,700}\b(?:insert|upsert|update)\s*\(\s*(?:\{|\[?\s*\{)[\s\S]{0,700}\b(?:ownerId|creatorId|userId|orgId|tenantId|role|isAdmin)\b/i;

export const supabaseClientOwnedAuthzField = defineScanRule({
  id: "supabase-client-owned-authz-field",
  title: "Client writes Supabase authorization field",
  severity: "error",
  recommendation:
    "Use RLS policies based on `auth.uid()` and server-owned membership rows; do not trust client-provided owner, org, or role columns.",
  scan: (file) => {
    if (!isClientSourcePath(file.relativePath)) return [];
    if (!SENSITIVE_AUTH_FIELD_PATTERN.test(file.content)) return [];
    if (!SUPABASE_CLIENT_AUTHZ_WRITE_PATTERN.test(file.content)) return [];

    const location = getMatchLocation(file.content, SENSITIVE_AUTH_FIELD_PATTERN);
    return [
      {
        message:
          "Client Supabase code appears to write user, tenant, owner, or role fields that should be enforced by RLS.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
