import { defineScanRule } from "../../utils/define-scan-rule.js";
import { isClientSourcePath } from "./utils/is-client-source-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

export const firebaseClientOwnedAuthzField = defineScanRule({
  id: "firebase-client-owned-authz-field",
  title: "Client writes authorization field",
  severity: "error",
  recommendation:
    "Derive authority fields on the server or enforce them in Firebase/Supabase rules; never trust client-provided owner, org, or role values.",
  scan: scanByPattern({
    shouldScan: (file) => isClientSourcePath(file.relativePath),
    pattern:
      /(?:\b(?:setDoc|updateDoc|addDoc)\s*\(|(?:\b(?:firebase|firestore|getFirestore)\b|\bcollection\s*\(|\.collection\s*\()[\s\S]{0,500}\.(?:set|update|add)\s*\()[\s\S]{0,700}\b(?:ownerId|ownerID|creatorId|creatorID|providerId|providerID|orgId|orgID|tenantId|tenantID|workspaceId|workspaceID|ghostOrg|role|roles|isAdmin)\b/i,
    message:
      "Client code writes an ownership, tenant, or role field that should be server-owned and immutable.",
  }),
});
