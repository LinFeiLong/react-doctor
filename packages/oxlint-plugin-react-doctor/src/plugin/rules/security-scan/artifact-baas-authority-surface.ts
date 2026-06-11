import { defineRule } from "../../utils/define-rule.js";
import { isBrowserArtifactPath } from "./utils/is-browser-artifact-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

const BAAS_CLIENT_CONFIG_PATTERN =
  /\b(?:initializeApp|firebase|firestore|getFirestore|createClient)\b[\s\S]{0,700}\b(?:apiKey|authDomain|projectId|databaseURL|storageBucket|supabase|SUPABASE_URL)\b|\b(?:apiKey|authDomain|projectId|databaseURL|storageBucket)\b[\s\S]{0,700}\b(?:firebase|firestore|getFirestore|initializeApp)\b/i;

// TODO(follow-up): de-overfit — the `boosts` / `candidateJobs` / `ghostOrg`
// collection literals mirror specific regression fixtures.
const BAAS_AUTHORITY_SURFACE_PATTERN =
  /\b(?:collection\s*\(\s*["'](?:boosts|sessions|sessions_admin|users|orgs|candidateJobs|conversations|documents|profiles)|from\s*\(\s*["'](?:users|profiles|documents|organizations|memberships)|creatorID|creatorId|providerId|ghostOrg|ownerId|orgId|tenantId|workspaceId|role|roles|isAdmin|SuperAdmin)\b/i;

export const artifactBaasAuthoritySurface = defineRule({
  id: "artifact-baas-authority-surface",
  title: "BaaS authority map shipped in browser artifact",
  severity: "warn",
  recommendation:
    "Client BaaS config is often public, but shipped collection names plus owner, role, tenant, or admin fields give attackers a precise authorization map. Verify rules/RLS enforce every boundary server-side.",
  scan: scanByPattern({
    shouldScan: (file) => isBrowserArtifactPath(file.relativePath, file.isGeneratedBundle),
    pattern: BAAS_AUTHORITY_SURFACE_PATTERN,
    requireAll: [BAAS_CLIENT_CONFIG_PATTERN],
    message:
      "A browser artifact exposes Firebase/Supabase config together with sensitive collections or authorization fields.",
  }),
});
