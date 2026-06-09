import { definePostureRule } from "../../utils/define-posture-rule.js";
import { isConfigOrCiPath } from "./utils/is-config-or-ci-path.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

export const clickjackingRedirectRisk = definePostureRule({
  id: "clickjacking-redirect-risk",
  title: "Redirect or frame boundary risk",
  severity: "warn",
  recommendation:
    "Allowlist redirect origins/paths, set `frame-ancestors` for privileged pages, and avoid URL-prefilled privileged dialogs.",
  scan: scanByPattern({
    shouldScan: (file) =>
      isProductionSourcePath(file.relativePath) || isConfigOrCiPath(file.relativePath),
    pattern:
      /\bredirect\s*\([^)]*(?:searchParams\.get|nextUrl\.searchParams|returnTo|continue|next)\b|<iframe\b[\s\S]{0,700}\b(?:next=|continue=|redirect|userstoinvite|sharingaction|role=|\.\.)|frame-ancestors\s+(?:\*|'self'\s+\*)|X-Frame-Options["']?\s*:\s*["']?ALLOW/i,
    message:
      "Redirect or framing configuration may let attacker-controlled URLs chain into privileged UI or clickjacking.",
  }),
});
