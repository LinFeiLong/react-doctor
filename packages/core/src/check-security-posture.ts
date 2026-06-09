import * as fs from "node:fs";
import * as path from "node:path";
import { visitorKeys } from "oxc-parser";
import { isAstNode, isNodeOfType, parseSourceText } from "oxlint-plugin-react-doctor/ast";
import type { EsTreeNode, EsTreeNodeOfType } from "oxlint-plugin-react-doctor/ast";
import {
  GENERATED_BUNDLE_FILE_PATTERN,
  SECURITY_SCAN_MAX_BUNDLE_FILE_SIZE_BYTES,
  SECURITY_SCAN_MAX_DIRECTORY_DEPTH,
  SECURITY_SCAN_MAX_FILES,
  SECURITY_SCAN_MAX_FILE_SIZE_BYTES,
} from "./constants.js";
import { readDirectoryEntries } from "./project-info/index.js";
import type { Diagnostic } from "./types/index.js";
import { isLargeMinifiedFile } from "./utils/is-large-minified-file.js";

interface ScannedFile {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly content: string;
  readonly isGeneratedBundle: boolean;
}

interface SecurityDiagnosticInput {
  readonly filePath: string;
  readonly rule: string;
  readonly title: string;
  readonly severity: Diagnostic["severity"];
  readonly message: string;
  readonly help: string;
  readonly content: string;
  readonly pattern?: RegExp;
  readonly line?: number;
  readonly column?: number;
}

interface SecurityScanner {
  readonly rule: string;
  readonly title: string;
  readonly severity: Diagnostic["severity"];
  readonly shouldScan: (file: ScannedFile) => boolean;
  readonly pattern: RegExp;
  readonly message: string;
  readonly help: string;
}

interface DirectoryStackEntry {
  readonly absolutePath: string;
  readonly depth: number;
}

interface SourceLocation {
  readonly line: number;
  readonly column: number;
}

type ScanBucket = "priority" | "artifact" | "other";

const SKIPPED_DIRECTORY_NAMES = new Set([
  ".git",
  ".turbo",
  ".vercel",
  "coverage",
  "node_modules",
  "tmp",
]);

const TEXT_FILE_PATTERN =
  /\.(?:[cm]?[jt]sx?|json|jsonc|map|html?|mdx?|ya?ml|toml|sql|rules|env|txt|log|svg|xml|pem|key|crt|cert|pub|py|php)$/i;

const DOTENV_FILE_PATTERN = /(?:^|\/)\.env(?:\.|$)/;

const SOURCE_FILE_PATTERN = /\.(?:[cm]?[jt]sx?)$/i;

const SCRIPT_SOURCE_FILE_PATTERN = /\.(?:[cm]?[jt]sx?|py|php)$/i;

const DATABASE_SOURCE_FILE_PATTERN = /\.(?:[cm]?[jt]sx?|py)$/i;

const SERVER_CONTEXT_PATTERN =
  /(?:^|\/)(?:api|backend|server|servers|middleware|route|routes|functions|lambdas|workers)(?:\/|$)|(?:^|\/)[^/]+\.server\.[cm]?[jt]sx?$/i;

const TEST_CONTEXT_PATTERN =
  /(?:^|\/)(?:__fixtures__|__mocks__|__tests__|fixtures|mocks|test|tests)(?:\/|$)|\.(?:test|spec|fixture|fixtures|stories|story)\.[cm]?[jt]sx?$/i;

const DOCUMENTATION_CONTEXT_PATTERN =
  /(?:^|\/)(?:README|CHANGELOG|CONTRIBUTING|PUBLISHING|DOCS)\.mdx?$|\.mdx?$/i;

const GENERATED_SOURCE_CONTEXT_PATTERN =
  /(?:^|\/)(?:generated|__generated__|dist|build|coverage|out|storybook-static)(?:\/|$)|(?:^|\/)\.next\/|(?:^|\/)public\/(?:chunks?|assets?|build|dist|static)\/|(?:generated|\.gen)\.[cm]?[jt]sx?$/i;

const BROWSER_ARTIFACT_PATH_PATTERNS = [
  /(?:^|\/)\.next\/static\//,
  /(?:^|\/)\.output\/public\//,
  /(?:^|\/)build\/static\//,
  /(?:^|\/)dist\/assets\//,
  /(?:^|\/)public\//,
  /(?:^|\/)out\//,
  /(?:^|\/)storybook-static\//,
];

const SECRET_VALUE_PATTERNS = [
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  /\bAWS_SECRET_ACCESS_KEY\s*[:=]\s*["']?[A-Za-z0-9/+=]{35,}["']?/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bglpat-[A-Za-z0-9_-]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/,
  /\brk_(?:live|test)_[A-Za-z0-9]{16,}\b/,
  /\bsk-[A-Za-z0-9_-]{32,}\b/,
  /\bsk-ant-api\d{2}-[A-Za-z0-9_-]{20,}\b/,
  /\blin_(?:api|oauth)_[A-Za-z0-9]{20,}\b/,
  /\bvercel_[A-Za-z0-9]{20,}\b/,
  /\bsntrys_[A-Za-z0-9_-]{20,}\b/,
  /\bkey-[a-f0-9]{32}\b/i,
  /\bnpm_[A-Za-z0-9]{30,}\b/,
  /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
  /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/,
  /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/,
  /\bsb_secret_[A-Za-z0-9_]{20,}\b/,
  /\bservice_role\b/i,
  /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/,
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /\b(?:postgres|mysql|mongodb(?:\+srv)?|redis):\/\/[^:\s/@]+:[^@\s/]+@/i,
];

const PUBLIC_ENV_SECRET_NAME_PATTERN =
  /\b(?:NEXT_PUBLIC|VITE|REACT_APP|EXPO_PUBLIC)_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE|DATABASE_URL|SERVICE_ROLE|AWS_ACCESS_KEY|AWS_SECRET)[A-Z0-9_]*\b/i;

const FULL_ENV_LEAK_CONTEXT_PATTERN =
  /\b(?:process\.env|import\.meta\.env|window\.__[A-Z0-9_]*ENV[A-Z0-9_]*__|__[A-Z0-9_]*ENV[A-Z0-9_]*__)\b/;

const FULL_ENV_LEAK_SECRET_NAME_PATTERN =
  /\b(?:DATABASE_URL|AWS_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID|MAILGUN_API_KEY|SALESFORCE_CLIENT_SECRET|OKTA_CLIENT_SECRET|SESSION_SECRET|COOKIE_SECRET|PRIVATE_KEY|SERVICE_ROLE)\b/;

const SENSITIVE_AUTH_FIELD_PATTERN =
  /\b(?:ownerId|ownerID|creatorId|creatorID|userId|userID|uid|providerId|providerID|orgId|orgID|tenantId|tenantID|teamId|teamID|workspaceId|workspaceID|ghostOrg|role|roles|isAdmin|admin)\b/;

const SUPABASE_CLIENT_AUTHZ_WRITE_PATTERN =
  /\b(?:supabase\b|\.from\s*\(\s*["'][^"']+["']\s*\))[\s\S]{0,700}\b(?:insert|upsert|update)\s*\(\s*(?:\{|\[?\s*\{)[\s\S]{0,700}\b(?:ownerId|creatorId|userId|orgId|tenantId|role|isAdmin)\b/i;

const PRIVILEGED_QUERY_PARAM_PATTERN =
  /\b(?:searchParams|URLSearchParams|request\.nextUrl\.searchParams|location\.search)\b[\s\S]{0,700}\b(?:email|user|userstoinvite|role|permission|sharingaction|invite|admin|next|continue|returnTo|redirect_uri)\b/i;

const TRUSTED_PUBLIC_SECRET_NAME_PATTERN =
  /(?:SENTRY_DSN|PUBLIC_KEY|PUBLISHABLE|ANON_KEY|POSTHOG_PROJECT_TOKEN|POSTHOG_KEY|TLDRAW_LICENSE_KEY|CLERK_PUBLISHABLE_KEY|ALGOLIA_SEARCH_KEY|GC_API_KEY|GOOGLE_MAPS_API_KEY|MAPBOX_TOKEN)/i;

const BAAS_CLIENT_CONFIG_PATTERN =
  /\b(?:initializeApp|firebase|firestore|getFirestore|createClient)\b[\s\S]{0,700}\b(?:apiKey|authDomain|projectId|databaseURL|storageBucket|supabase|SUPABASE_URL)\b|\b(?:apiKey|authDomain|projectId|databaseURL|storageBucket)\b[\s\S]{0,700}\b(?:firebase|firestore|getFirestore|initializeApp)\b/i;

const BAAS_AUTHORITY_SURFACE_PATTERN =
  /\b(?:collection\s*\(\s*["'](?:boosts|sessions|sessions_admin|users|orgs|candidateJobs|conversations|documents|profiles)|from\s*\(\s*["'](?:users|profiles|documents|organizations|memberships)|creatorID|creatorId|providerId|ghostOrg|ownerId|orgId|tenantId|workspaceId|role|roles|isAdmin|SuperAdmin)\b/i;

const POSTMESSAGE_ORIGIN_CHECK_PATTERN =
  /(?:event|e)\.origin|\.origin\s*[!=]==?|origin.*(?:check|valid|allow|trust)|(?:check|valid|allow|trust).*origin/i;

const OUTBOUND_FETCH_CALL_PATTERN =
  /\b(?:fetch|axios\.\s*(?:get|post|put|delete|head)|got|got\.\s*(?:get|post))\s*\(\s*([^,)]+)/;

const CALLER_STYLE_URL_NAME_PATTERN =
  /\b(?:url|targetUrl|callbackUrl|redirectUrl|webhookUrl|companyUrl|websiteUrl|domainUrl|imageUrl|fetchUrl|next|return_to|returnTo|destination|location)\b/i;

const SAFE_REDIRECT_MODE_PATTERN = /\bredirect\s*:\s*["'](?:manual|error)["']/;

const DANGEROUS_HTML_PATTERN = /dangerouslySetInnerHTML|\.innerHTML\s*=/;

const DANGEROUS_HTML_TAINT_PATTERN =
  /searchParams|query|params|request|req\.|response\.|result\.|data\.|await|fetch|props\.|children|content|html|body|text|message/i;

const AGENT_TOOL_DEFINITION_PATTERN =
  /\b(?:tool\s*\(\s*\{|createTool\s*\(|defineTool\s*\(|new\s+(?:DynamicTool|StructuredTool)\s*\()/;

const AGENT_TOOL_DANGEROUS_CAPABILITY_PATTERN =
  /\b(?:exec|execSync|spawn|child_process|eval|new Function|vm\.run|readFile|writeFile|fs\.read|fs\.write|fetch|axios|http\.request|sandbox|runCode|executeCode)\b/;

const MCP_IMPORT_PATTERN =
  /\bfrom\s+["']@modelcontextprotocol\/sdk[^"']*["']|\bMcpServer\b|\bMcpAgent\b/;

const MCP_TOOL_SURFACE_PATTERN =
  /\b(?:server\.\s*(?:tool|resource|prompt)\s*\(|register(?:Tool|Resource|Prompt)\s*\(|setRequestHandler\s*\(\s*(?:CallToolRequestSchema|ListToolsRequestSchema)|new\s+(?:McpServer|McpAgent)\s*\()/;

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

const NOSQL_INJECTION_RISK_PATTERN =
  /\$where\s*['"]?\s*:\s*(?:f?['"`][^'"`]{0,200}\$\{|function|f['"])|\.find\s*\(\s*JSON\.parse\s*\(\s*(?:req|request)\.|\.aggregate\s*\(\s*\[?\s*\{[^}]{0,400}\$where|\bnew\s+RegExp\s*\(\s*(?:req|request)\.|\$regex['"]?\s*:\s*(?:req|request)\./i;

const COMMAND_EXECUTION_INPUT_RISK_PATTERN =
  /\b(?:exec|execSync|spawn|os\.system|subprocess\.(?:run|Popen|call)|shell_exec|exec|system|passthru|proc_open)\s*\([\s\S]{0,220}(?:req\.|request\.|params\.|query\.|body\.|searchParams|\$_(?:GET|POST|REQUEST)|shell\s*=\s*true|f['"`][^'"`]*\{)/i;

const PATH_TRAVERSAL_RISK_PATTERN =
  /\b(?:readFile|readFileSync|writeFile|writeFileSync)\s*\(\s*(?:req\.|request\.|params\.|query\.|body\.|parsed\.|`[^`]*(?:req\.|request\.|params\.|query\.|body\.))|\bpath\.(?:join|resolve)\s*\([^)]*\b(?:req\.|request\.|params\.|query\.|body\.|parsed\.)/;

const GIT_PROVIDER_URL_INJECTION_PATTERN =
  /(?:api\.github\.com|github\.com|gitlab\.com|bitbucket\.org)[^`'"]{0,200}\$\{|`https?:\/\/[^`]{0,80}git[^`]{0,80}\$\{/i;

const WEBHOOK_HANDLER_PATTERN =
  /(?:^|\/)[^/]*webhook[^/]*\/|(?:^|\/)[^/]*webhook[^/]*\.[cm]?[jt]s$|\bwebhook\b/i;

const WEBHOOK_ENTRYPOINT_PATTERN =
  /\b(?:export\s+(?:async\s+)?function\s+POST|export\s+const\s+(?:POST|handler|webhook)|webhookHandler|webhookRoute)\b/i;

const WEBHOOK_SIGNATURE_VERIFICATION_PATTERN =
  /verifySignature|verify.*signature|constructEvent|createHmac|timingSafeEqual|svix|webhookSecret|stripe\.webhooks/i;

const INSECURE_CRYPTO_PATTERN =
  /createHash\s*\(\s*["'](?:md5|sha1)["']|createCipher\s*\(|\b(?:DES|RC4|Blowfish)\b|\bmd5\s*\(|(?:===?|!==?)\s*.{0,40}\b(?:hmac|digest)\b|\b(?:hmac|digest)\b.{0,40}(?:===?|!==?)/i;

const UNSAFE_SIGNATURE_COMPARISON_PATTERN =
  /[A-Za-z_$][\w$.]*signature[\w$]*(?:\([^)]*\))?\s*(?:===?|!==?)\s*[A-Za-z_$][\w$.]*(?:\([^)]*\))?|[A-Za-z_$][\w$.]*(?:\([^)]*\))?\s*(?:===?|!==?)\s*[A-Za-z_$][\w$.]*signature[\w$]*(?:\([^)]*\))?/i;

const SECURITY_RANDOM_CONTEXT_PATTERN =
  /\b(?:token|secret|key|password|nonce|salt|session|csrf|auth|credential|hash)\b/i;

const normalizeRelativePath = (filePath: string): string => filePath.replace(/\\/g, "/");

const isProbablyTextFile = (relativePath: string): boolean =>
  TEXT_FILE_PATTERN.test(relativePath) || DOTENV_FILE_PATTERN.test(relativePath);

const isRepositorySecretFilePath = (relativePath: string): boolean =>
  DOTENV_FILE_PATTERN.test(relativePath) ||
  /(?:^|\/)\.npmrc$/.test(relativePath) ||
  /(?:^|\/)[^/]*(?:credential|credentials|service-account|serviceAccount|firebase-admin|google-service-account|gcp-service-account)[^/]*\.(?:json|env|pem|key)$/i.test(
    relativePath,
  );

const isRepositorySecretExamplePath = (relativePath: string): boolean =>
  /(?:^|\/)\.env\.example$|(?:^|\/)[^/]*(?:example|sample|template)[^/]*\.(?:env|json|pem|key)$/i.test(
    relativePath,
  );

const isServerOnlyBuildArtifactPath = (relativePath: string): boolean =>
  /(?:^|\/)(?:\.next\/server|\.output\/server)\//.test(relativePath);

const isBrowserArtifactPath = (relativePath: string, isGeneratedBundle: boolean): boolean => {
  if (isServerOnlyBuildArtifactPath(relativePath)) return false;
  if (isGeneratedBundle) return true;
  if (relativePath.endsWith(".map")) return true;
  return BROWSER_ARTIFACT_PATH_PATTERNS.some((pattern) => pattern.test(relativePath));
};

const isClientSourcePath = (relativePath: string): boolean => {
  if (!isProductionSourcePath(relativePath)) return false;
  if (SERVER_CONTEXT_PATTERN.test(relativePath)) return false;
  return true;
};

const isServerRouteSourcePath = (relativePath: string): boolean => {
  if (!isProductionSourcePath(relativePath)) return false;
  if (SERVER_CONTEXT_PATTERN.test(relativePath)) return true;
  return /(?:^|\/)(?:middleware|route)\.[cm]?[jt]sx?$/.test(relativePath);
};

const isProductionFilePath = (relativePath: string, sourceFilePattern: RegExp): boolean => {
  if (!sourceFilePattern.test(relativePath)) return false;
  if (TEST_CONTEXT_PATTERN.test(relativePath)) return false;
  if (DOCUMENTATION_CONTEXT_PATTERN.test(relativePath)) return false;
  if (GENERATED_SOURCE_CONTEXT_PATTERN.test(relativePath)) return false;
  return true;
};

const isProductionSourcePath = (relativePath: string): boolean => {
  return isProductionFilePath(relativePath, SOURCE_FILE_PATTERN);
};

const isProductionScriptSourcePath = (relativePath: string): boolean =>
  isProductionFilePath(relativePath, SCRIPT_SOURCE_FILE_PATTERN);

const isProductionDatabaseSourcePath = (relativePath: string): boolean =>
  isProductionFilePath(relativePath, DATABASE_SOURCE_FILE_PATTERN);

const isConfigOrCiPath = (relativePath: string): boolean =>
  /(?:^|\/)(?:package\.json|Dockerfile|docker-compose\.ya?ml|\.github\/workflows\/[^/]+\.ya?ml|vercel\.json|next\.config\.[cm]?[jt]s|netlify\.toml)$/i.test(
    relativePath,
  );

const isSqlPath = (relativePath: string): boolean =>
  relativePath.endsWith(".sql") || /(?:^|\/)supabase\/(?:migrations|schemas)\//.test(relativePath);

const isFirebaseRulesPath = (relativePath: string): boolean =>
  /(?:^|\/)(?:firestore\.rules|storage\.rules|database\.rules\.json)$/.test(relativePath);

const isPublicDebugArtifactPath = (relativePath: string): boolean =>
  isBrowserArtifactPath(relativePath, GENERATED_BUNDLE_FILE_PATTERN.test(relativePath)) &&
  /(?:^|\/)(?:\.env(?:\.[^/]*)?|[^/]*(?:debug|crash|trace|stack|report|dump|phpinfo)[^/]*\.(?:txt|log|json|html?)|[^/]+\.log)$/i.test(
    relativePath,
  );

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getLocationAtIndex = (content: string, matchIndex: number): SourceLocation => {
  if (matchIndex < 0) return { line: 0, column: 0 };
  const prefix = content.slice(0, matchIndex);
  const lines = prefix.split(/\r?\n/);
  return {
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
  };
};

const getMatchLocation = (content: string, pattern: RegExp | undefined): SourceLocation =>
  getLocationAtIndex(content, pattern === undefined ? -1 : content.search(pattern));

const getNodeStartIndex = (node: EsTreeNode): number => {
  if (node.range !== undefined) return node.range[0];
  if ("start" in node && typeof node.start === "number") return node.start;
  return -1;
};

const getNodeEndIndex = (node: EsTreeNode): number => {
  if (node.range !== undefined) return node.range[1];
  if ("end" in node && typeof node.end === "number") return node.end;
  return -1;
};

const getNodeLocation = (content: string, node: EsTreeNode): SourceLocation =>
  getLocationAtIndex(content, getNodeStartIndex(node));

const buildDiagnostic = (input: SecurityDiagnosticInput): Diagnostic => {
  const location =
    input.line !== undefined && input.column !== undefined
      ? { line: input.line, column: input.column }
      : getMatchLocation(input.content, input.pattern);
  return {
    filePath: input.filePath,
    plugin: "react-doctor",
    rule: input.rule,
    title: input.title,
    severity: input.severity,
    message: input.message,
    help: input.help,
    line: location.line,
    column: location.column,
    category: "Security",
  };
};

const addDiagnostic = (
  diagnostics: Diagnostic[],
  seen: Set<string>,
  diagnostic: Diagnostic,
): void => {
  const key = `${diagnostic.rule}:${diagnostic.filePath}:${diagnostic.line}:${diagnostic.column}:${diagnostic.message}`;
  if (seen.has(key)) return;
  seen.add(key);
  diagnostics.push(diagnostic);
};

const parseSourceAst = (file: ScannedFile): EsTreeNode | null => {
  if (!isProductionSourcePath(file.relativePath)) return null;
  return parseSourceText(file.absolutePath, file.content);
};

const walkAst = (root: EsTreeNode, visit: (node: EsTreeNode) => void): void => {
  const stack: EsTreeNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) continue;
    visit(node);
    const keys = visitorKeys[node.type] ?? [];
    const nodeRecord = node as unknown as Record<string, unknown>;
    for (let keyIndex = keys.length - 1; keyIndex >= 0; keyIndex -= 1) {
      const child = nodeRecord[keys[keyIndex]];
      if (Array.isArray(child)) {
        for (let childIndex = child.length - 1; childIndex >= 0; childIndex -= 1) {
          const item = child[childIndex];
          if (isAstNode(item)) stack.push(item);
        }
        continue;
      }
      if (isAstNode(child)) stack.push(child);
    }
  }
};

const getNodeText = (file: ScannedFile, node: EsTreeNode | undefined): string => {
  if (node === undefined) return "";
  const startIndex = getNodeStartIndex(node);
  const endIndex = getNodeEndIndex(node);
  if (startIndex < 0 || endIndex < 0) return "";
  return file.content.slice(startIndex, endIndex);
};

const getCalleeText = (file: ScannedFile, node: EsTreeNodeOfType<"CallExpression">): string => {
  return isAstNode(node.callee) ? getNodeText(file, node.callee) : "";
};

const getStringLiteralValue = (node: EsTreeNode | undefined): string | null => {
  if (!node) return null;
  if (!isNodeOfType(node, "Literal")) return null;
  if (typeof node.value === "string") return node.value;
  return null;
};

const readScannedFile = (absolutePath: string, rootDirectory: string): ScannedFile | null => {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(absolutePath);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;

  const relativePath = normalizeRelativePath(path.relative(rootDirectory, absolutePath));
  const isGeneratedBundle =
    GENERATED_BUNDLE_FILE_PATTERN.test(relativePath) || isLargeMinifiedFile(absolutePath);
  const maxSizeBytes = isGeneratedBundle
    ? SECURITY_SCAN_MAX_BUNDLE_FILE_SIZE_BYTES
    : SECURITY_SCAN_MAX_FILE_SIZE_BYTES;
  if (stat.size > maxSizeBytes) return null;
  if (
    !isGeneratedBundle &&
    !isProbablyTextFile(relativePath) &&
    !isConfigOrCiPath(relativePath) &&
    !isRepositorySecretFilePath(relativePath)
  ) {
    return null;
  }

  try {
    return {
      absolutePath,
      relativePath,
      content: fs.readFileSync(absolutePath, "utf-8"),
      isGeneratedBundle,
    };
  } catch {
    return null;
  }
};

const classifyScanBucket = (relativePath: string): ScanBucket | null => {
  const isGeneratedByName = GENERATED_BUNDLE_FILE_PATTERN.test(relativePath);
  if (
    isRepositorySecretFilePath(relativePath) ||
    isSqlPath(relativePath) ||
    isFirebaseRulesPath(relativePath) ||
    isConfigOrCiPath(relativePath)
  ) {
    return "priority";
  }
  if (isBrowserArtifactPath(relativePath, isGeneratedByName)) return "artifact";
  if (isProbablyTextFile(relativePath)) return "other";
  return null;
};

const collectScannedFiles = (rootDirectory: string): ScannedFile[] => {
  const priorityFiles: ScannedFile[] = [];
  const artifactFiles: ScannedFile[] = [];
  const otherFiles: ScannedFile[] = [];
  const stack: DirectoryStackEntry[] = [{ absolutePath: rootDirectory, depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    if (current.depth > SECURITY_SCAN_MAX_DIRECTORY_DEPTH) continue;

    const entries = readDirectoryEntries(current.absolutePath);
    for (const entry of entries) {
      const absolutePath = path.join(current.absolutePath, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
          stack.push({ absolutePath, depth: current.depth + 1 });
        }
        continue;
      }

      const relativePath = normalizeRelativePath(path.relative(rootDirectory, absolutePath));
      const bucket = classifyScanBucket(relativePath);
      if (bucket === null) continue;
      const bucketFiles =
        bucket === "priority" ? priorityFiles : bucket === "artifact" ? artifactFiles : otherFiles;
      if (bucketFiles.length >= SECURITY_SCAN_MAX_FILES) continue;

      const scannedFile = readScannedFile(absolutePath, rootDirectory);
      if (scannedFile !== null) bucketFiles.push(scannedFile);
    }
  }

  return [...priorityFiles, ...artifactFiles, ...otherFiles];
};

const hasSecretValue = (content: string): boolean =>
  SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(content));

const findSuspiciousPublicEnvSecretNamePattern = (content: string): RegExp | undefined => {
  for (const match of content.matchAll(new RegExp(PUBLIC_ENV_SECRET_NAME_PATTERN.source, "gi"))) {
    const value = match[0] ?? "";
    if (!TRUSTED_PUBLIC_SECRET_NAME_PATTERN.test(value)) {
      return new RegExp(escapeRegExp(value));
    }
  }
  return undefined;
};

const hasSuspiciousPublicEnvSecretName = (content: string): boolean =>
  findSuspiciousPublicEnvSecretNamePattern(content) !== undefined;

const hasFullEnvLeakShape = (content: string): boolean =>
  FULL_ENV_LEAK_CONTEXT_PATTERN.test(content) && FULL_ENV_LEAK_SECRET_NAME_PATTERN.test(content);

const scannerDefinitions: ReadonlyArray<SecurityScanner> = [
  {
    rule: "firebase-permissive-rules",
    title: "Permissive Firebase security rule",
    severity: "error",
    shouldScan: (file) => isFirebaseRulesPath(file.relativePath),
    pattern:
      /allow\s+(?:read|write|create|update|delete|list|get|read,\s*write)\s*:\s*if\s+(?:true|request\.auth\s*!=\s*null)\s*;?/i,
    message:
      "Firebase rules grant broad access to everyone or to any signed-in user, which is the Chattr/Firewreck failure mode.",
    help: "Bind every read/write to `request.auth.uid`, immutable ownership, and tenant membership instead of treating sign-in as authorization.",
  },
  {
    rule: "firebase-client-owned-authz-field",
    title: "Client writes authorization field",
    severity: "error",
    shouldScan: (file) => isClientSourcePath(file.relativePath),
    pattern:
      /(?:\b(?:setDoc|updateDoc|addDoc)\s*\(|(?:\b(?:firebase|firestore|getFirestore)\b|\bcollection\s*\(|\.collection\s*\()[\s\S]{0,500}\.(?:set|update|add)\s*\()[\s\S]{0,700}\b(?:ownerId|ownerID|creatorId|creatorID|providerId|providerID|orgId|orgID|tenantId|tenantID|workspaceId|workspaceID|ghostOrg|role|roles|isAdmin)\b/i,
    message:
      "Client code writes an ownership, tenant, or role field that should be server-owned and immutable.",
    help: "Derive authority fields on the server or enforce them in Firebase/Supabase rules; never trust client-provided owner, org, or role values.",
  },
  {
    rule: "firebase-query-filter-as-auth",
    title: "Firestore query filter used as authorization",
    severity: "warning",
    shouldScan: (file) => isClientSourcePath(file.relativePath),
    pattern:
      /\.where\s*\(\s*["'](?:uid|userId|userID|ownerId|ownerID|orgId|orgID|tenantId|tenantID|role)["']\s*,\s*["']==["']/i,
    message:
      "Firestore query code filters by an auth-shaped field; filtering is not authorization unless rules enforce the same boundary.",
    help: "Make sure Firestore rules compare the requested document against `request.auth.uid` and trusted membership data.",
  },
  {
    rule: "tenant-static-proxy-risk",
    title: "Tenant-controlled static asset proxy",
    severity: "warning",
    shouldScan: (file) => isServerRouteSourcePath(file.relativePath),
    pattern:
      /\b(?:tenant|subdomain|org|organization|workspace|hostPattern|params)\b[\s\S]{0,700}\b(?:fetch|S3|s3|cdn|bucket|path\.join|join\(["']\/["']\)|decodeURIComponent)\b/i,
    message:
      "Route code appears to compose tenant or subdomain input into a static/CDN/object-store fetch path.",
    help: "Bind tenant identity to the trusted host or authenticated org, canonicalize after decoding, reject traversal, and never let one tenant choose another tenant's asset prefix.",
  },
  {
    rule: "mdx-ssr-execution-risk",
    title: "Server-rendered MDX can execute code",
    severity: "warning",
    shouldScan: (file) => isProductionSourcePath(file.relativePath),
    pattern:
      /\b(?:@mdx-js\/mdx|next-mdx-remote|MDXRemote|compileMDX|evaluate|compile)\b[\s\S]{0,700}\b(?:mdx|markdown|content|source|body|repo|customer|tenant|cache|process\.env|rehypeRaw|allowDangerousHtml)\b/i,
    message:
      "MDX/markdown rendering code may evaluate user or repository content during SSR or static generation.",
    help: "Use a constrained compiler for untrusted content, disable expressions/raw HTML, sandbox renderers, and avoid caching attacker-controlled output across tenants.",
  },
  {
    rule: "local-rpc-native-bridge-risk",
    title: "Weak localhost native bridge boundary",
    severity: "warning",
    shouldScan: (file) => isProductionSourcePath(file.relativePath),
    pattern:
      /\b(?:127\.0\.0\.1|localhost|Access-Control-Allow-Origin|websocket|WebSocket)\b[\s\S]{0,700}\b(?:includes|indexOf|endsWith|UpdateApp|InstallApp|install|update|exec|spawn)\b/i,
    message:
      "Code appears to bridge browser code to localhost/native capabilities with weak origin or update/install checks.",
    help: "Use exact origin allowlists after URL parsing, per-request nonces, narrow methods, and never expose install/update commands to arbitrary web pages.",
  },
  {
    rule: "url-prefilled-privileged-action",
    title: "URL pre-fills a privileged action",
    severity: "warning",
    shouldScan: (file) => isClientSourcePath(file.relativePath),
    pattern: PRIVILEGED_QUERY_PARAM_PATTERN,
    message:
      "Client code reads sensitive action state from the URL, which can pre-fill invites, roles, redirects, or sharing flows with attacker values.",
    help: "Require server-side validation and explicit confirmation for URL-sourced invite, role, permission, redirect, or sharing parameters.",
  },
  {
    rule: "clickjacking-redirect-risk",
    title: "Redirect or frame boundary risk",
    severity: "warning",
    shouldScan: (file) =>
      isProductionSourcePath(file.relativePath) || isConfigOrCiPath(file.relativePath),
    pattern:
      /\bredirect\s*\([^)]*(?:searchParams\.get|nextUrl\.searchParams|returnTo|continue|next)\b|<iframe\b[\s\S]{0,700}\b(?:next=|continue=|redirect|userstoinvite|sharingaction|role=|\.\.)|frame-ancestors\s+(?:\*|'self'\s+\*)|X-Frame-Options["']?\s*:\s*["']?ALLOW/i,
    message:
      "Redirect or framing configuration may let attacker-controlled URLs chain into privileged UI or clickjacking.",
    help: "Allowlist redirect origins/paths, set `frame-ancestors` for privileged pages, and avoid URL-prefilled privileged dialogs.",
  },
  {
    rule: "svg-filter-clickjacking-risk",
    title: "SVG-filtered iframe clickjacking primitive",
    severity: "warning",
    shouldScan: (file) => isProductionSourcePath(file.relativePath),
    pattern:
      /<iframe\b[\s\S]{0,700}\bfilter\s*:\s*["']?url\(#|filter\s*:\s*url\(#.*[\s\S]{0,700}<iframe\b|<fe(?:DisplacementMap|ColorMatrix|Composite|Tile|Morphology)\b[\s\S]{0,700}<iframe\b/i,
    message:
      "An iframe is rendered through an SVG/CSS filter, which can support advanced clickjacking or visual exfiltration tricks.",
    help: "Avoid filtering cross-origin iframes. Use `frame-ancestors` on sensitive pages and keep SVG filters away from embedded privileged UI.",
  },
  {
    rule: "import-metadata-execution-risk",
    title: "Imported metadata reaches code execution",
    severity: "error",
    shouldScan: (file) => isProductionSourcePath(file.relativePath),
    pattern:
      /(?:\b(?:eval|new Function|vm\.runIn|Lua|python|exec|spawn)\b|<script\b)[\s\S]{0,700}\b(?:exif|metadata|manifest|preset|plugin|upload|drop|archive|zip|import|restore)\b/i,
    message: "Imported metadata, uploads, or plugin manifests appear to reach code execution.",
    help: "Parse imported metadata as data with strict schemas; do not evaluate EXIF, manifests, presets, dropped files, or archives.",
  },
  {
    rule: "plugin-update-trust-risk",
    title: "Plugin or updater trust boundary risk",
    severity: "warning",
    shouldScan: (file) =>
      isProductionSourcePath(file.relativePath) || isConfigOrCiPath(file.relativePath),
    pattern:
      /\b(?:repoUrl|updateUrl|UpdateApp|InstallApp|auto.?update|download|installer|curl|wget)\b[\s\S]{0,700}\b(?:https?:\/\/|\binstall(?:er)?\b|\bupdate\b|\bbinary\b|\.zip\b|\.exe\b|\.dmg\b|\.appimage\b)/i,
    message:
      "Code appears to download, install, update, or execute plugin/updater content across a trust boundary.",
    help: "Require signed updates/plugins, pin trusted repositories, verify hashes before execution, and keep custom repository installs behind explicit warnings.",
  },
  {
    rule: "key-lifecycle-risk",
    title: "Long-lived key material in repository",
    severity: "error",
    shouldScan: (file) => !TEST_CONTEXT_PATTERN.test(file.relativePath),
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----|\b(?:SSH_PRIVATE_KEY|GPG_PRIVATE_KEY|DEPLOY_KEY|SIGNING_KEY)\b/i,
    message: "Private or long-lived release key material appears in the repository.",
    help: "Remove private keys from source, rotate exposed credentials, prefer short-lived deploy credentials, and document revocation/expiry for release keys.",
  },
  {
    rule: "cors-cookie-trust-risk",
    title: "Broad cookie or credentialed CORS trust",
    severity: "warning",
    shouldScan: (file) =>
      isProductionSourcePath(file.relativePath) || isConfigOrCiPath(file.relativePath),
    pattern:
      /Access-Control-Allow-Credentials["']?\s*[:,]\s*["']?true[\s\S]{0,700}Access-Control-Allow-Origin["']?\s*[:,]\s*["']?(?:\*|https:\/\/docs\.|https:\/\/.*mintlify)|\b(?:session|auth|token|jwt)[^=\n]{0,80}\bDomain=\./i,
    message:
      "Credentialed CORS or broad auth-cookie scope can make a docs/custom-domain XSS become account compromise.",
    help: "Keep auth cookies host-only and HttpOnly, avoid credentialed CORS for less-trusted docs/vendor origins, and isolate documentation domains from app sessions.",
  },
];

const scanArtifactSecrets = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isBrowserArtifactPath(file.relativePath, file.isGeneratedBundle)) return;

  const secretPattern = SECRET_VALUE_PATTERNS.find((pattern) => pattern.test(file.content));
  if (secretPattern !== undefined) {
    addDiagnostic(
      diagnostics,
      seen,
      buildDiagnostic({
        filePath: file.relativePath,
        rule: "artifact-secret-leak",
        title: "Secret shipped in browser artifact",
        severity: "error",
        message: "A browser-delivered artifact contains a secret-looking credential value.",
        help: "Remove the secret from client bundles/static assets, rotate it, and route privileged service calls through server-only code.",
        content: file.content,
        pattern: secretPattern,
      }),
    );
  }

  const envLeakPattern =
    findSuspiciousPublicEnvSecretNamePattern(file.content) ??
    (hasFullEnvLeakShape(file.content) ? FULL_ENV_LEAK_SECRET_NAME_PATTERN : undefined);

  if (envLeakPattern !== undefined) {
    addDiagnostic(
      diagnostics,
      seen,
      buildDiagnostic({
        filePath: file.relativePath,
        rule: "artifact-env-leak",
        title: "Server env leaked to browser artifact",
        severity: "error",
        message:
          "A browser artifact contains server-secret environment names or a full environment dump shape.",
        help: "Treat public env prefixes as publication, not secrecy; keep secret env vars server-only and rebuild after rotating leaked keys.",
        content: file.content,
        pattern: envLeakPattern,
      }),
    );
  }
};

const scanArtifactBaasAuthoritySurface = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isBrowserArtifactPath(file.relativePath, file.isGeneratedBundle)) return;
  if (!BAAS_CLIENT_CONFIG_PATTERN.test(file.content)) return;
  if (!BAAS_AUTHORITY_SURFACE_PATTERN.test(file.content)) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "artifact-baas-authority-surface",
      title: "BaaS authority map shipped in browser artifact",
      severity: "warning",
      message:
        "A browser artifact exposes Firebase/Supabase config together with sensitive collections or authorization fields.",
      help: "Client BaaS config is often public, but shipped collection names plus owner, role, tenant, or admin fields give attackers a precise authorization map. Verify rules/RLS enforce every boundary server-side.",
      content: file.content,
      pattern: BAAS_AUTHORITY_SURFACE_PATTERN,
    }),
  );
};

const scanPublicDebugArtifact = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isPublicDebugArtifactPath(file.relativePath)) return;
  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "public-debug-artifact",
      title: "Public debug artifact",
      severity: hasSecretValue(file.content) ? "error" : "warning",
      message: "A browser-reachable debug, log, dump, report, or env artifact is present.",
      help: "Remove debug artifacts from public output; logs and dumps often reveal source paths, internal routes, tokens, or environment snapshots.",
      content: file.content,
    }),
  );
};

const scanActiveStaticAssets = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  const svgActivePattern = /<script\b|on(?:load|error|click|mouseover)\s*=/i;
  if (
    file.relativePath.endsWith(".svg") &&
    isBrowserArtifactPath(file.relativePath, file.isGeneratedBundle)
  ) {
    if (svgActivePattern.test(file.content)) {
      addDiagnostic(
        diagnostics,
        seen,
        buildDiagnostic({
          filePath: file.relativePath,
          rule: "active-static-asset",
          title: "Active SVG in public assets",
          severity: "error",
          message: "A browser-reachable SVG contains script or event-handler code.",
          help: "Serve untrusted SVG as downloads, sanitize it, or isolate it on a cookieless asset origin with a restrictive CSP.",
          content: file.content,
          pattern: svgActivePattern,
        }),
      );
    }
    return;
  }

  if (!isProductionSourcePath(file.relativePath) && !isConfigOrCiPath(file.relativePath)) return;

  const dangerousAllowSvgPattern = /dangerouslyAllowSVG\s*:\s*true/i;
  const executableSvgEmbedPattern =
    /<(?:object|embed|iframe)\b[^>]+(?:data|src)=["'][^"']+\.svg(?:\?[^"']*)?["']/i;
  if (dangerousAllowSvgPattern.test(file.content) || executableSvgEmbedPattern.test(file.content)) {
    addDiagnostic(
      diagnostics,
      seen,
      buildDiagnostic({
        filePath: file.relativePath,
        rule: "active-static-asset",
        title: "Executable SVG exposure",
        severity: "warning",
        message: "The app enables or embeds SVG in an executable browser context.",
        help: "Prefer `<img>` for SVG images; if SVG must be served directly, use attachment disposition and a CSP that blocks scripts and objects.",
        content: file.content,
        pattern: dangerousAllowSvgPattern.test(file.content)
          ? dangerousAllowSvgPattern
          : executableSvgEmbedPattern,
      }),
    );
  }
};

const scanPackageJsonSecrets = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!file.relativePath.endsWith("package.json")) return;
  const pattern =
    findSuspiciousPublicEnvSecretNamePattern(file.content) ??
    SECRET_VALUE_PATTERNS.find((candidate) => candidate.test(file.content));
  if (pattern === undefined) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "package-metadata-secret",
      title: "Secret-like package metadata",
      severity: "warning",
      message: "Package metadata contains secret-like values or public env secret names.",
      help: "Keep secrets out of package metadata and generated reports; they are often published to registries, logs, or browser artifacts.",
      content: file.content,
      pattern,
    }),
  );
};

const scanRepositorySecretFile = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isRepositorySecretFilePath(file.relativePath)) return;
  if (isRepositorySecretExamplePath(file.relativePath)) return;
  if (TEST_CONTEXT_PATTERN.test(file.relativePath)) return;
  if (!hasSecretValue(file.content) && !hasSuspiciousPublicEnvSecretName(file.content)) return;

  const pattern =
    SECRET_VALUE_PATTERNS.find((candidate) => candidate.test(file.content)) ??
    findSuspiciousPublicEnvSecretNamePattern(file.content);

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "repository-secret-file",
      title: "Secret file checked into repository",
      severity: "error",
      message: "A repository credential/config file contains secret-looking values.",
      help: "Remove committed env files, service-account credentials, npm auth tokens, and webhook URLs; rotate exposed values and keep only redacted examples in source.",
      content: file.content,
      pattern,
    }),
  );
};

const scanPublicEnvSecretName = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isClientSourcePath(file.relativePath)) return;
  const pattern = findSuspiciousPublicEnvSecretNamePattern(file.content);
  if (pattern === undefined) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "public-env-secret-name",
      title: "Secret-like public env variable",
      severity: "warning",
      message:
        "Client code references a public env variable whose name looks like a secret or privileged credential.",
      help: "Public env prefixes are inlined into browser bundles. Rename public values to non-secret names, and keep tokens, passwords, private keys, and service-role credentials server-only.",
      content: file.content,
      pattern,
    }),
  );
};

const scanBuildPipelineSecretBoundary = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isConfigOrCiPath(file.relativePath)) return;

  const ciInstallNearSecretPattern =
    /(?:npm|pnpm|yarn|bun)\s+(?:install|ci)\b(?:(?!--ignore-scripts)[\s\S]){0,700}\bsecrets\.[A-Z0-9_]+|\bsecrets\.[A-Z0-9_]+(?:(?!--ignore-scripts)[\s\S]){0,700}(?:npm|pnpm|yarn|bun)\s+(?:install|ci)\b/i;
  const pattern = file.relativePath.endsWith("package.json") ? null : ciInstallNearSecretPattern;

  if (pattern === null || !pattern.test(file.content)) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "build-pipeline-secret-boundary",
      title: "Build pipeline runs code near secrets",
      severity: "warning",
      message:
        "The build or install pipeline can execute package lifecycle code while CI secrets may be present.",
      help: "Run dependency installs with scripts disabled before exposing secrets, isolate untrusted build code, and move signing/deploy authority into a narrow privileged step.",
      content: file.content,
      pattern,
    }),
  );
};

const scanSupabaseRlsPolicyRisk = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isSqlPath(file.relativePath)) return;

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

  if (pattern === null) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "supabase-rls-policy-risk",
      title: "Permissive Supabase RLS policy",
      severity: "error",
      message:
        "Supabase policy SQL disables RLS, permits writes broadly, or references a service-role bypass.",
      help: "Keep public-read policies explicit, but gate inserts, updates, deletes, and service-role bypasses behind `auth.uid()` plus trusted tenant membership.",
      content: file.content,
      pattern,
    }),
  );
};

const scanPostMessageOriginRisk = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isProductionSourcePath(file.relativePath)) return;
  const ast = parseSourceAst(file);
  if (ast === null) return;

  walkAst(ast, (node) => {
    if (node.type !== "CallExpression" && node.type !== "AssignmentExpression") return;

    const nodeText = getNodeText(file, node);
    let isMessageHandler = false;
    if (node.type === "CallExpression") {
      const calleeText = getCalleeText(file, node);
      const args = Array.isArray(node.arguments) ? node.arguments : [];
      const firstArgument = isAstNode(args[0]) ? args[0] : undefined;
      isMessageHandler =
        calleeText.endsWith("addEventListener") &&
        getStringLiteralValue(firstArgument) === "message";
    } else {
      const left = node.left;
      isMessageHandler = isAstNode(left) && getNodeText(file, left).endsWith(".onmessage");
    }

    if (!isMessageHandler) return;
    const originCheckIndex = nodeText.search(POSTMESSAGE_ORIGIN_CHECK_PATTERN);
    const messageDataIndex = nodeText.search(/\b(?:event|e)\.data\b/);
    if (originCheckIndex >= 0 && (messageDataIndex < 0 || originCheckIndex < messageDataIndex)) {
      return;
    }

    const location = getNodeLocation(file.content, node);

    addDiagnostic(
      diagnostics,
      seen,
      buildDiagnostic({
        filePath: file.relativePath,
        rule: "postmessage-origin-risk",
        title: "postMessage handler without origin check",
        severity: "warning",
        message:
          "A message event handler reads cross-window messages without an obvious origin check.",
        help: "Validate `event.origin` against an exact allowlist before using `event.data`, especially when an iframe or parent window can be attacker-controlled.",
        content: file.content,
        line: location.line,
        column: location.column,
      }),
    );
  });
};

const scanUntrustedRedirectFollowing = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (
    !isServerRouteSourcePath(file.relativePath) &&
    !SERVER_CONTEXT_PATTERN.test(file.relativePath)
  ) {
    return;
  }
  if (!OUTBOUND_FETCH_CALL_PATTERN.test(file.content)) return;

  const lines = file.content.split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    const fetchMatch = line.match(OUTBOUND_FETCH_CALL_PATTERN);
    if (!fetchMatch || !CALLER_STYLE_URL_NAME_PATTERN.test(fetchMatch[1] ?? "")) continue;

    const fetchWindow = lines.slice(lineIndex, lineIndex + 5).join("\n");
    if (SAFE_REDIRECT_MODE_PATTERN.test(fetchWindow)) continue;

    addDiagnostic(
      diagnostics,
      seen,
      buildDiagnostic({
        filePath: file.relativePath,
        rule: "untrusted-redirect-following",
        title: "Server fetch follows redirects for caller-shaped URL",
        severity: "warning",
        message:
          "Server-side fetch code appears to follow redirects for a URL shaped like caller-controlled input.",
        help: 'Use `redirect: "manual"` or equivalent and re-validate every redirect target before following it to avoid SSRF redirect bypasses.',
        content: file.content,
        line: lineIndex + 1,
        column: line.search(/\S/) + 1,
      }),
    );
  }
};

const scanDangerousHtmlSink = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isProductionSourcePath(file.relativePath)) return;
  if (!DANGEROUS_HTML_PATTERN.test(file.content)) return;

  const lines = file.content.split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    if (!DANGEROUS_HTML_PATTERN.test(line)) continue;

    const htmlWindow = lines.slice(Math.max(0, lineIndex - 3), lineIndex + 5).join("\n");
    if (/__html\s*:\s*["'`]/.test(htmlWindow)) continue;
    if (!DANGEROUS_HTML_TAINT_PATTERN.test(htmlWindow)) continue;

    addDiagnostic(
      diagnostics,
      seen,
      buildDiagnostic({
        filePath: file.relativePath,
        rule: "dangerous-html-sink",
        title: "HTML injection sink with dynamic content",
        severity: "warning",
        message:
          "HTML is injected from a dynamic-looking source, which can become XSS if the value is user-controlled or unsanitized.",
        help: "Prefer rendering structured React nodes. If HTML is required, sanitize with a well-reviewed sanitizer and keep the trust boundary close to the sink.",
        content: file.content,
        line: lineIndex + 1,
        column: line.search(/\S/) + 1,
      }),
    );
  }
};

const scanAgentToolCapabilityRisk = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isProductionSourcePath(file.relativePath)) return;
  if (
    !/(?:^|\/)(?:agents?|tools?|mcp)(?:\/|$)|(?:agent|tool|mcp)[^/]*\.[cm]?[jt]sx?$/i.test(
      file.relativePath,
    )
  ) {
    return;
  }
  if (!AGENT_TOOL_DEFINITION_PATTERN.test(file.content)) return;
  if (!AGENT_TOOL_DANGEROUS_CAPABILITY_PATTERN.test(file.content)) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "agent-tool-capability-risk",
      title: "Agent tool exposes dangerous capability",
      severity: "warning",
      message:
        "An agent-callable tool appears to expose network, filesystem, shell, or code-execution capability.",
      help: "Treat tool inputs as prompt-injection controlled. Validate arguments, scope permissions per call, and avoid exposing shell/file/network primitives directly to agents.",
      content: file.content,
      pattern: AGENT_TOOL_DEFINITION_PATTERN,
    }),
  );
};

const scanMcpToolCapabilityRisk = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isProductionSourcePath(file.relativePath)) return;
  if (!MCP_IMPORT_PATTERN.test(file.content)) return;
  if (!MCP_TOOL_SURFACE_PATTERN.test(file.content)) return;
  if (!AGENT_TOOL_DANGEROUS_CAPABILITY_PATTERN.test(file.content)) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "mcp-tool-capability-risk",
      title: "MCP tool exposes dangerous capability",
      severity: "warning",
      message:
        "An MCP tool/resource/prompt handler appears to expose file, shell, network, or code-execution capability.",
      help: "MCP tool calls run with the connecting client's authority. Validate inputs, enforce per-tool authorization, and avoid raw filesystem/shell/network access where possible.",
      content: file.content,
      pattern: MCP_TOOL_SURFACE_PATTERN,
    }),
  );
};

const scanRawSqlRisk = (file: ScannedFile, diagnostics: Diagnostic[], seen: Set<string>): void => {
  if (!isProductionScriptSourcePath(file.relativePath)) return;
  const pattern = RAW_SQL_RISK_PATTERNS.find((candidate) => candidate.test(file.content));
  if (pattern === undefined) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "raw-sql-injection-risk",
      title: "Raw SQL built outside parameter binding",
      severity: "warning",
      message:
        "Code uses a raw SQL escape hatch or string-built query shape that can bypass parameter binding.",
      help: "Keep user input in driver parameters or ORM bind variables. Avoid unsafe/raw SQL helpers and string interpolation for queries.",
      content: file.content,
      pattern,
    }),
  );
};

const scanNoSqlInjectionRisk = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isProductionDatabaseSourcePath(file.relativePath)) return;
  if (!NOSQL_INJECTION_RISK_PATTERN.test(file.content)) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "nosql-injection-risk",
      title: "NoSQL query accepts operator-shaped input",
      severity: "warning",
      message: "Code appears to pass raw JSON, regex, or `$where` style input into a NoSQL query.",
      help: "Coerce scalar fields before querying, reject operator keys from client input, and avoid `$where` or request-derived regexes.",
      content: file.content,
      pattern: NOSQL_INJECTION_RISK_PATTERN,
    }),
  );
};

const scanCommandExecutionInputRisk = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isProductionScriptSourcePath(file.relativePath)) return;
  if (!COMMAND_EXECUTION_INPUT_RISK_PATTERN.test(file.content)) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "command-execution-input-risk",
      title: "Command execution uses caller-shaped input",
      severity: "error",
      message:
        "Command execution appears to include request, query, body, or shell-interpolated input.",
      help: "Avoid shell execution for caller-controlled values. Use fixed commands, argument arrays, strict allowlists, and no shell interpolation.",
      content: file.content,
      pattern: COMMAND_EXECUTION_INPUT_RISK_PATTERN,
    }),
  );
};

const scanPathTraversalRisk = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isProductionSourcePath(file.relativePath)) return;
  if (!PATH_TRAVERSAL_RISK_PATTERN.test(file.content)) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "path-traversal-risk",
      title: "Filesystem path uses caller input",
      severity: "warning",
      message:
        "Filesystem access appears to use request, query, params, or body data as part of the path.",
      help: "Resolve paths against a fixed base directory, reject traversal after normalization, and map user-visible identifiers to server-owned paths.",
      content: file.content,
      pattern: PATH_TRAVERSAL_RISK_PATTERN,
    }),
  );
};

const scanGitProviderUrlInjectionRisk = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isProductionSourcePath(file.relativePath)) return;
  if (!GIT_PROVIDER_URL_INJECTION_PATTERN.test(file.content)) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "git-provider-url-injection-risk",
      title: "Git provider URL built from interpolation",
      severity: "warning",
      message:
        "GitHub/GitLab/Bitbucket URL construction interpolates path components that may be attacker-controlled.",
      help: "Validate owner, repo, org, and branch identifiers against strict slugs and build URLs with URL/path encoders instead of raw interpolation.",
      content: file.content,
      pattern: GIT_PROVIDER_URL_INJECTION_PATTERN,
    }),
  );
};

const scanWebhookSignatureRisk = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isProductionSourcePath(file.relativePath)) return;
  if (
    !WEBHOOK_HANDLER_PATTERN.test(file.relativePath) &&
    !WEBHOOK_HANDLER_PATTERN.test(file.content)
  ) {
    return;
  }
  if (!WEBHOOK_ENTRYPOINT_PATTERN.test(file.content)) return;
  if (WEBHOOK_SIGNATURE_VERIFICATION_PATTERN.test(file.content)) return;

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "webhook-signature-risk",
      title: "Webhook handler lacks signature verification",
      severity: "warning",
      message: "Webhook handler code does not show an obvious signature verification step.",
      help: "Verify provider signatures before parsing or acting on webhook bodies. Use provider SDK helpers or HMAC verification with timing-safe comparison.",
      content: file.content,
      pattern: WEBHOOK_ENTRYPOINT_PATTERN,
    }),
  );
};

const scanInsecureCryptoRisk = (
  file: ScannedFile,
  diagnostics: Diagnostic[],
  seen: Set<string>,
): void => {
  if (!isProductionSourcePath(file.relativePath)) return;
  const hasInsecurePrimitive =
    INSECURE_CRYPTO_PATTERN.test(file.content) ||
    UNSAFE_SIGNATURE_COMPARISON_PATTERN.test(file.content);
  const hasSecurityRandom =
    SECURITY_RANDOM_CONTEXT_PATTERN.test(file.content) && /Math\.random\s*\(/.test(file.content);
  if (!hasInsecurePrimitive && !hasSecurityRandom) return;

  let pattern = /Math\.random\s*\(/;
  if (INSECURE_CRYPTO_PATTERN.test(file.content)) {
    pattern = INSECURE_CRYPTO_PATTERN;
  } else if (UNSAFE_SIGNATURE_COMPARISON_PATTERN.test(file.content)) {
    pattern = UNSAFE_SIGNATURE_COMPARISON_PATTERN;
  }

  addDiagnostic(
    diagnostics,
    seen,
    buildDiagnostic({
      filePath: file.relativePath,
      rule: "insecure-crypto-risk",
      title: "Weak cryptography in security context",
      severity: "warning",
      message:
        "Code uses weak hashes, deprecated ciphers, timing-unsafe comparisons, or Math.random in a security-shaped context.",
      help: "Use modern primitives, `crypto.randomBytes` / Web Crypto randomness, and timing-safe comparisons for signatures, digests, tokens, and auth material.",
      content: file.content,
      pattern,
    }),
  );
};

export const checkSecurityPosture = (rootDirectory: string): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const seen = new Set<string>();
  const files = collectScannedFiles(rootDirectory);

  for (const file of files) {
    scanArtifactSecrets(file, diagnostics, seen);
    scanArtifactBaasAuthoritySurface(file, diagnostics, seen);
    scanPublicDebugArtifact(file, diagnostics, seen);
    scanActiveStaticAssets(file, diagnostics, seen);
    scanPackageJsonSecrets(file, diagnostics, seen);
    scanRepositorySecretFile(file, diagnostics, seen);
    scanPublicEnvSecretName(file, diagnostics, seen);
    scanBuildPipelineSecretBoundary(file, diagnostics, seen);
    scanSupabaseRlsPolicyRisk(file, diagnostics, seen);
    scanPostMessageOriginRisk(file, diagnostics, seen);
    scanUntrustedRedirectFollowing(file, diagnostics, seen);
    scanDangerousHtmlSink(file, diagnostics, seen);
    scanAgentToolCapabilityRisk(file, diagnostics, seen);
    scanMcpToolCapabilityRisk(file, diagnostics, seen);
    scanRawSqlRisk(file, diagnostics, seen);
    scanNoSqlInjectionRisk(file, diagnostics, seen);
    scanCommandExecutionInputRisk(file, diagnostics, seen);
    scanPathTraversalRisk(file, diagnostics, seen);
    scanGitProviderUrlInjectionRisk(file, diagnostics, seen);
    scanWebhookSignatureRisk(file, diagnostics, seen);
    scanInsecureCryptoRisk(file, diagnostics, seen);

    for (const scanner of scannerDefinitions) {
      if (!scanner.shouldScan(file)) continue;
      if (!scanner.pattern.test(file.content)) continue;
      addDiagnostic(
        diagnostics,
        seen,
        buildDiagnostic({
          filePath: file.relativePath,
          rule: scanner.rule,
          title: scanner.title,
          severity: scanner.severity,
          message: scanner.message,
          help: scanner.help,
          content: file.content,
          pattern: scanner.pattern,
        }),
      );
    }

    if (
      isClientSourcePath(file.relativePath) &&
      SENSITIVE_AUTH_FIELD_PATTERN.test(file.content) &&
      SUPABASE_CLIENT_AUTHZ_WRITE_PATTERN.test(file.content)
    ) {
      addDiagnostic(
        diagnostics,
        seen,
        buildDiagnostic({
          filePath: file.relativePath,
          rule: "supabase-client-owned-authz-field",
          title: "Client writes Supabase authorization field",
          severity: "error",
          message:
            "Client Supabase code appears to write user, tenant, owner, or role fields that should be enforced by RLS.",
          help: "Use RLS policies based on `auth.uid()` and server-owned membership rows; do not trust client-provided owner, org, or role columns.",
          content: file.content,
          pattern: SENSITIVE_AUTH_FIELD_PATTERN,
        }),
      );
    }
  }

  return diagnostics;
};
