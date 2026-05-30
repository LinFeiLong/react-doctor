import { GENERIC_SECRET_MIN_LENGTH_CHARS } from "../constants.js";

export const REDACTED_PLACEHOLDER = "<redacted>";

interface RedactionRule {
  readonly pattern: RegExp;
  readonly replacement: string;
}

// High-precision detectors for credentials and PII that can ride along
// inside a diagnostic's `message` / `help` when a rule echoes a source
// fragment (e.g. `useState("sk-live-…")`). Ordered so structured matches
// (key blocks, JWTs, credentialed URLs) run before the broad
// generic-token sweep, and so each replacement leaves only inert
// `<redacted>` text that no later rule can re-match. Patterns are
// intentionally narrow — they target real secret shapes, never ordinary
// identifiers or short captions — so normal diagnostics stay readable.
const buildRedactionRules = (): RedactionRule[] => {
  const genericTokenPattern = new RegExp(
    // A contiguous base64url / hex run long enough to be a credential,
    // constrained by lookaheads to contain BOTH a letter and a digit so
    // plain prose words and all-digit line/column noise never match. The
    // class deliberately excludes `= + /` so the run can't bleed across a
    // `name=value` separator and swallow an adjacent label.
    `\\b(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*[0-9])[A-Za-z0-9_-]{${GENERIC_SECRET_MIN_LENGTH_CHARS},}`,
    "g",
  );

  return [
    {
      pattern:
        /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z]+ )*PRIVATE KEY-----/g,
      replacement: REDACTED_PLACEHOLDER,
    },
    {
      pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
      replacement: REDACTED_PLACEHOLDER,
    },
    {
      // Credentials embedded in a URL authority (`scheme://user:pass@host`).
      // Lookbehind / lookahead keep the scheme and host so the location
      // stays useful while the `user:pass` pair is masked.
      pattern: /(?<=:\/\/)[^\s/:@]+:[^\s/:@]+(?=@)/g,
      replacement: REDACTED_PLACEHOLDER,
    },
    { pattern: /\bAKIA[0-9A-Z]{16}\b/g, replacement: REDACTED_PLACEHOLDER },
    { pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}/g, replacement: REDACTED_PLACEHOLDER },
    { pattern: /\bgithub_pat_[A-Za-z0-9_]{22,}/g, replacement: REDACTED_PLACEHOLDER },
    { pattern: /\bglpat-[A-Za-z0-9_-]{20,}/g, replacement: REDACTED_PLACEHOLDER },
    { pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, replacement: REDACTED_PLACEHOLDER },
    { pattern: /\b[sprk]k_(?:live|test)_[A-Za-z0-9]{10,}/g, replacement: REDACTED_PLACEHOLDER },
    { pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, replacement: REDACTED_PLACEHOLDER },
    { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g, replacement: REDACTED_PLACEHOLDER },
    { pattern: /\bya29\.[0-9A-Za-z_-]{20,}/g, replacement: REDACTED_PLACEHOLDER },
    {
      pattern: /(?<=\bBearer\s)[A-Za-z0-9._~+/=-]{16,}/g,
      replacement: REDACTED_PLACEHOLDER,
    },
    {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      replacement: REDACTED_PLACEHOLDER,
    },
    { pattern: genericTokenPattern, replacement: REDACTED_PLACEHOLDER },
  ];
};

const REDACTION_RULES = buildRedactionRules();

/**
 * Masks API keys, tokens, private keys, credentialed URLs, and emails
 * found anywhere inside a free-text string, returning the scrubbed text.
 * Applied to every diagnostic's `message` / `help` at construction time
 * so secrets never reach the terminal, the JSON report, or the score
 * API — react-doctor must never echo or transmit a user's secrets.
 */
export const redactSensitiveText = (text: string): string => {
  if (!text) return text;
  let redacted = text;
  for (const rule of REDACTION_RULES) {
    redacted = redacted.replace(rule.pattern, rule.replacement);
  }
  return redacted;
};
