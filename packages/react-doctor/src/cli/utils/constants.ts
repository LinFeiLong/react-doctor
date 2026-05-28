// Exit code for processes terminated by SIGINT (Ctrl-C), per POSIX
// (128 + signal number). Used by exit-gracefully.ts on SIGINT/SIGTERM.
export const SIGINT_EXIT_CODE = 130;

export const STAGED_FILES_TEMP_DIR_PREFIX = "react-doctor-staged-";

export const GIT_HOOK_EXECUTABLE_MODE = 0o755;

export const AGENT_HOOK_TIMEOUT_SECONDS = 120;

export const SETUP_PROMPT_DELAY_MS = 100;

// Last-resort fallback when buildJsonReportError itself throws — keeps
// stdout valid JSON so downstream parsers don't see a half-written report.
export const INTERNAL_ERROR_JSON_FALLBACK =
  '{"schemaVersion":1,"ok":false,"error":{"message":"Internal error","name":"Error","chain":[]}}\n';

// --triage caps. We hand every surviving diagnostic to Claude in a single
// prompt; this cap keeps the prompt size bounded on noisy projects without
// silently dropping work mid-list. No wall-clock timeout — the SDK runs
// until Claude returns a result or the user Ctrl-Cs.
export const TRIAGE_MAX_DIAGNOSTICS_COUNT = 200;
// Auth sources, listed in preferred order. The Agent SDK accepts any of:
// 1. CLAUDE_CODE_OAUTH_TOKEN — `claude setup-token` against a Pro/Max plan
// 2. ANTHROPIC_API_KEY — a console API key (pay-as-you-go billing)
// 3. existing Claude Code login — credentials cached in ~/.claude/ by the
//    bundled `claude` binary; the SDK picks these up automatically when no
//    env var is set, so users who already ran `claude /login` need nothing.
export const TRIAGE_OAUTH_TOKEN_ENV_VARIABLE = "CLAUDE_CODE_OAUTH_TOKEN";
export const TRIAGE_API_KEY_ENV_VARIABLE = "ANTHROPIC_API_KEY";
export const TRIAGE_MODEL_ENV_VARIABLE = "REACT_DOCTOR_TRIAGE_MODEL";
export const TRIAGE_DEFAULT_MODEL = "claude-opus-4-7";
