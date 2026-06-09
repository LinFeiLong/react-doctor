import { defineRule } from "../../utils/define-rule.js";
import type { Rule } from "../../utils/rule.js";

const createSecurityPostureRule = () => ({});

export const activeStaticAsset = defineRule<Rule>({
  id: "active-static-asset",
  title: "Executable SVG exposure",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Serve untrusted SVG as downloads, sanitize it, or isolate it on a cookieless asset origin with a restrictive CSP.",
  create: createSecurityPostureRule,
});

export const agentToolCapabilityRisk = defineRule<Rule>({
  id: "agent-tool-capability-risk",
  title: "Agent tool exposes dangerous capability",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Keep agent tools narrow, validate tool input, and avoid exposing filesystem, network, subprocess, or code execution capabilities unless sandboxed.",
  create: createSecurityPostureRule,
});

export const artifactBaasAuthoritySurface = defineRule<Rule>({
  id: "artifact-baas-authority-surface",
  title: "BaaS authority map shipped in browser artifact",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Move authorization-sensitive BaaS collection and role surfaces behind server-owned policy checks.",
  create: createSecurityPostureRule,
});

export const artifactEnvLeak = defineRule<Rule>({
  id: "artifact-env-leak",
  title: "Server env leaked to browser artifact",
  severity: "error",
  tags: ["security-posture"],
  recommendation:
    "Keep server-only environment names and values out of browser artifacts and source maps.",
  create: createSecurityPostureRule,
});

export const artifactSecretLeak = defineRule<Rule>({
  id: "artifact-secret-leak",
  title: "Secret shipped in browser artifact",
  severity: "error",
  tags: ["security-posture"],
  recommendation:
    "Rotate exposed credentials and ensure browser bundles contain only public, client-safe configuration.",
  create: createSecurityPostureRule,
});

export const buildPipelineSecretBoundary = defineRule<Rule>({
  id: "build-pipeline-secret-boundary",
  title: "Build pipeline runs code near secrets",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Disable dependency lifecycle scripts before release secrets are available, or isolate install/build phases from secret-bearing steps.",
  create: createSecurityPostureRule,
});

export const clickjackingRedirectRisk = defineRule<Rule>({
  id: "clickjacking-redirect-risk",
  title: "Redirect or frame boundary risk",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Validate redirect targets, avoid privileged prefilled iframe flows, and set frame boundaries for sensitive routes.",
  create: createSecurityPostureRule,
});

export const commandExecutionInputRisk = defineRule<Rule>({
  id: "command-execution-input-risk",
  title: "Command execution uses caller-shaped input",
  severity: "error",
  tags: ["security-posture"],
  recommendation:
    "Avoid shell execution for caller-controlled values. Use fixed commands, argument arrays, strict allowlists, and no shell interpolation.",
  create: createSecurityPostureRule,
});

export const corsCookieTrustRisk = defineRule<Rule>({
  id: "cors-cookie-trust-risk",
  title: "Broad cookie or credentialed CORS trust",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Avoid credentialed CORS for broad first-party domains and scope auth cookies to the smallest trusted host.",
  create: createSecurityPostureRule,
});

export const dangerousHtmlSink = defineRule<Rule>({
  id: "dangerous-html-sink",
  title: "HTML injection sink with dynamic content",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Sanitize dynamic HTML with a trusted sanitizer or render structured content instead of assigning raw HTML.",
  create: createSecurityPostureRule,
});

export const firebaseClientOwnedAuthzField = defineRule<Rule>({
  id: "firebase-client-owned-authz-field",
  title: "Client writes authorization field",
  severity: "error",
  tags: ["security-posture"],
  recommendation:
    "Derive owner, tenant, and role fields from authenticated server or rule context instead of trusting client writes.",
  create: createSecurityPostureRule,
});

export const firebasePermissiveRules = defineRule<Rule>({
  id: "firebase-permissive-rules",
  title: "Permissive Firebase security rule",
  severity: "error",
  tags: ["security-posture"],
  recommendation:
    "Lock Firebase rules to authenticated ownership checks and avoid `if true` or auth-only write policies for broad document matches.",
  create: createSecurityPostureRule,
});

export const firebaseQueryFilterAsAuth = defineRule<Rule>({
  id: "firebase-query-filter-as-auth",
  title: "Firestore query filter used as authorization",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Treat Firestore query filters as UX hints, not authorization. Enforce ownership in security rules.",
  create: createSecurityPostureRule,
});

export const gitProviderUrlInjectionRisk = defineRule<Rule>({
  id: "git-provider-url-injection-risk",
  title: "Git provider URL built from interpolation",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Validate owner, repo, org, and branch identifiers against strict slugs and build URLs with encoders instead of raw interpolation.",
  create: createSecurityPostureRule,
});

export const importMetadataExecutionRisk = defineRule<Rule>({
  id: "import-metadata-execution-risk",
  title: "Imported metadata reaches code execution",
  severity: "error",
  tags: ["security-posture"],
  recommendation:
    "Treat imported metadata as untrusted data and never pass it to eval-like execution paths.",
  create: createSecurityPostureRule,
});

export const insecureCryptoRisk = defineRule<Rule>({
  id: "insecure-crypto-risk",
  title: "Weak cryptography in security context",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Use modern primitives, secure randomness, and timing-safe comparisons for signatures, digests, tokens, and auth material.",
  create: createSecurityPostureRule,
});

export const keyLifecycleRisk = defineRule<Rule>({
  id: "key-lifecycle-risk",
  title: "Long-lived key material in repository",
  severity: "error",
  tags: ["security-posture"],
  recommendation:
    "Remove checked-in private keys or long-lived release credentials, rotate them, and use scoped secret storage.",
  create: createSecurityPostureRule,
});

export const localRpcNativeBridgeRisk = defineRule<Rule>({
  id: "local-rpc-native-bridge-risk",
  title: "Weak localhost native bridge boundary",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Bind localhost bridges to strict origin checks, unpredictable tokens, and narrow native capabilities.",
  create: createSecurityPostureRule,
});

export const mcpToolCapabilityRisk = defineRule<Rule>({
  id: "mcp-tool-capability-risk",
  title: "MCP tool exposes dangerous capability",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Keep MCP tools least-privileged and validate access to filesystem, network, subprocess, or code execution capabilities.",
  create: createSecurityPostureRule,
});

export const mdxSsrExecutionRisk = defineRule<Rule>({
  id: "mdx-ssr-execution-risk",
  title: "Server-rendered MDX can execute code",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Only render trusted MDX server-side, or compile untrusted content in a sandbox with a strict component allowlist.",
  create: createSecurityPostureRule,
});

export const nosqlInjectionRisk = defineRule<Rule>({
  id: "nosql-injection-risk",
  title: "NoSQL query accepts operator-shaped input",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Coerce scalar fields before querying, reject operator keys from client input, and avoid request-derived regexes or `$where`.",
  create: createSecurityPostureRule,
});

export const packageMetadataSecret = defineRule<Rule>({
  id: "package-metadata-secret",
  title: "Secret-like package metadata",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Remove tokens and credential-shaped values from package metadata and keep publish configuration non-secret.",
  create: createSecurityPostureRule,
});

export const pathTraversalRisk = defineRule<Rule>({
  id: "path-traversal-risk",
  title: "Filesystem path uses caller input",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Resolve paths against a fixed base directory, reject traversal after normalization, and map user-visible identifiers to server-owned paths.",
  create: createSecurityPostureRule,
});

export const pluginUpdateTrustRisk = defineRule<Rule>({
  id: "plugin-update-trust-risk",
  title: "Plugin or updater trust boundary risk",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Verify update URLs, plugin sources, and signatures before handing data to privileged installers or plugin loaders.",
  create: createSecurityPostureRule,
});

export const postmessageOriginRisk = defineRule<Rule>({
  id: "postmessage-origin-risk",
  title: "postMessage handler without origin check",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Check `event.origin` against exact trusted origins before reading or dispatching postMessage data.",
  create: createSecurityPostureRule,
});

export const publicDebugArtifact = defineRule<Rule>({
  id: "public-debug-artifact",
  title: "Public debug artifact",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Remove debug artifacts from public output; logs and dumps often reveal source paths, internal routes, tokens, or environment snapshots.",
  create: createSecurityPostureRule,
});

export const publicEnvSecretName = defineRule<Rule>({
  id: "public-env-secret-name",
  title: "Secret-like public env variable",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Do not put secret-shaped values behind public env prefixes. Public env variables are bundled for client code.",
  create: createSecurityPostureRule,
});

export const rawSqlInjectionRisk = defineRule<Rule>({
  id: "raw-sql-injection-risk",
  title: "Raw SQL built outside parameter binding",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Keep user input in driver parameters or ORM bind variables. Avoid unsafe/raw SQL helpers and string interpolation for queries.",
  create: createSecurityPostureRule,
});

export const repositorySecretFile = defineRule<Rule>({
  id: "repository-secret-file",
  title: "Secret file checked into repository",
  severity: "error",
  tags: ["security-posture"],
  recommendation:
    "Remove committed secret files, rotate any exposed credentials, and commit only redacted examples.",
  create: createSecurityPostureRule,
});

export const supabaseClientOwnedAuthzField = defineRule<Rule>({
  id: "supabase-client-owned-authz-field",
  title: "Client writes Supabase authorization field",
  severity: "error",
  tags: ["security-posture"],
  recommendation:
    "Use RLS policies based on `auth.uid()` and server-owned membership rows; do not trust client-provided owner, org, or role columns.",
  create: createSecurityPostureRule,
});

export const supabaseRlsPolicyRisk = defineRule<Rule>({
  id: "supabase-rls-policy-risk",
  title: "Permissive Supabase RLS policy",
  severity: "error",
  tags: ["security-posture"],
  recommendation:
    "Enable RLS and scope policies with `auth.uid()` or tenant membership checks instead of broad `true` or service-role bypasses.",
  create: createSecurityPostureRule,
});

export const svgFilterClickjackingRisk = defineRule<Rule>({
  id: "svg-filter-clickjacking-risk",
  title: "SVG-filtered iframe clickjacking primitive",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Avoid visually filtered iframes over privileged flows and enforce frame-ancestors or X-Frame-Options on sensitive routes.",
  create: createSecurityPostureRule,
});

export const tenantStaticProxyRisk = defineRule<Rule>({
  id: "tenant-static-proxy-risk",
  title: "Tenant-controlled static asset proxy",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Constrain tenant asset paths to server-owned mappings and avoid decoding caller-controlled paths into shared static origins.",
  create: createSecurityPostureRule,
});

export const untrustedRedirectFollowing = defineRule<Rule>({
  id: "untrusted-redirect-following",
  title: "Server fetch follows redirects for caller-shaped URL",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Use allowlisted destinations and manual/error redirect modes when fetching caller-provided URLs on the server.",
  create: createSecurityPostureRule,
});

export const urlPrefilledPrivilegedAction = defineRule<Rule>({
  id: "url-prefilled-privileged-action",
  title: "URL pre-fills a privileged action",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Require explicit user confirmation for privileged actions instead of trusting URL-prefilled recipients, roles, or redirects.",
  create: createSecurityPostureRule,
});

export const webhookSignatureRisk = defineRule<Rule>({
  id: "webhook-signature-risk",
  title: "Webhook handler lacks signature verification",
  severity: "warn",
  tags: ["security-posture"],
  recommendation:
    "Verify provider signatures before parsing or acting on webhook bodies. Use provider SDK helpers or HMAC verification with timing-safe comparison.",
  create: createSecurityPostureRule,
});
