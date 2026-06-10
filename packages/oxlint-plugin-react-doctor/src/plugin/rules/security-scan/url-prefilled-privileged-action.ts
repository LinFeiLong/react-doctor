import { defineRule } from "../../utils/define-rule.js";
import { isClientSourcePath } from "./utils/is-client-source-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

const PRIVILEGED_QUERY_PARAM_PATTERN =
  /\b(?:searchParams|URLSearchParams|request\.nextUrl\.searchParams|location\.search)\b[\s\S]{0,700}\b(?:email|user|userstoinvite|role|permission|sharingaction|invite|admin|next|continue|returnTo|redirect_uri)\b/i;

export const urlPrefilledPrivilegedAction = defineRule({
  id: "url-prefilled-privileged-action",
  title: "URL pre-fills a privileged action",
  severity: "warn",
  recommendation:
    "Require server-side validation and explicit confirmation for URL-sourced invite, role, permission, redirect, or sharing parameters.",
  scan: scanByPattern({
    shouldScan: (file) => isClientSourcePath(file.relativePath),
    pattern: PRIVILEGED_QUERY_PARAM_PATTERN,
    message:
      "Client code reads sensitive action state from the URL, which can pre-fill invites, roles, redirects, or sharing flows with attacker values.",
  }),
});
