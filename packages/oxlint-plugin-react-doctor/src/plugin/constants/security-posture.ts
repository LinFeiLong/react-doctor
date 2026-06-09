// Path/context patterns shared by MULTIPLE security-posture scan rules
// (see `src/plugin/utils/posture-scan.ts` for what a posture scan is).
// Patterns used by exactly one rule stay module-local in that rule's file.
// Secret-value patterns shared with the AST secret rules live next to
// SECRET_PATTERNS in `./security.ts`.

export const TEXT_FILE_PATTERN =
  /\.(?:[cm]?[jt]sx?|json|jsonc|map|html?|mdx?|ya?ml|toml|sql|rules|env|txt|log|svg|xml|pem|key|crt|cert|pub|py|php)$/i;

export const DOTENV_FILE_PATTERN = /(?:^|\/)\.env(?:\.|$)/;

export const SOURCE_FILE_PATTERN = /\.(?:[cm]?[jt]sx?)$/i;

export const SCRIPT_SOURCE_FILE_PATTERN = /\.(?:[cm]?[jt]sx?|py|php)$/i;

export const DATABASE_SOURCE_FILE_PATTERN = /\.(?:[cm]?[jt]sx?|py)$/i;

export const SERVER_CONTEXT_PATTERN =
  /(?:^|\/)(?:api|backend|server|servers|middleware|route|routes|functions|lambdas|workers)(?:\/|$)|(?:^|\/)[^/]+\.server\.[cm]?[jt]sx?$/i;

export const TEST_CONTEXT_PATTERN =
  /(?:^|\/)(?:__fixtures__|__mocks__|__tests__|fixtures|mocks|test|tests)(?:\/|$)|\.(?:test|spec|fixture|fixtures|stories|story)\.[cm]?[jt]sx?$/i;

export const DOCUMENTATION_CONTEXT_PATTERN =
  /(?:^|\/)(?:README|CHANGELOG|CONTRIBUTING|PUBLISHING|DOCS)\.mdx?$|\.mdx?$/i;

export const GENERATED_SOURCE_CONTEXT_PATTERN =
  /(?:^|\/)(?:generated|__generated__|dist|build|coverage|out|storybook-static)(?:\/|$)|(?:^|\/)\.next\/|(?:^|\/)public\/(?:chunks?|assets?|build|dist|static)\/|(?:generated|\.gen)\.[cm]?[jt]sx?$/i;

export const BROWSER_ARTIFACT_PATH_PATTERNS = [
  /(?:^|\/)\.next\/static\//,
  /(?:^|\/)\.output\/public\//,
  /(?:^|\/)build\/static\//,
  /(?:^|\/)dist\/assets\//,
  /(?:^|\/)public\//,
  /(?:^|\/)out\//,
  /(?:^|\/)storybook-static\//,
];

export const AGENT_TOOL_DANGEROUS_CAPABILITY_PATTERN =
  /\b(?:exec|execSync|spawn|child_process|eval|new Function|vm\.run|readFile|writeFile|fs\.read|fs\.write|fetch|axios|http\.request|sandbox|runCode|executeCode)\b/;
