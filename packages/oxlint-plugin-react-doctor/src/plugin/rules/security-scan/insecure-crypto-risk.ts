import { defineRule } from "../../utils/define-rule.js";
import type { ScanFinding } from "../../utils/file-scan.js";
import { getLocationAtIndex } from "./utils/get-location-at-index.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";

const WEAK_HASH_PATTERN = /createHash\s*\(\s*["'](?:md5|sha1)["']|\bmd5\s*\(/gi;

const SECURITY_CONTEXT_PATTERN =
  /\b(?:password|token|secret|signature|signing|auth|credential|session|cookie|csrf|api.?key)\b/i;

const DEPRECATED_CIPHER_API_PATTERN = /\bcreate(?:Cipher|Decipher)\s*\(/;

const WEAK_CIPHER_ALGORITHM_PATTERN =
  /\bcreate(?:Cipher|Decipher)iv\s*\(\s*["'](?:des|des3|des-?ede3?|rc4|rc2|bf|blowfish)\b/i;

// Case-sensitive on purpose: the case-insensitive form matches the French
// word "des" and similar prose in string literals and comments.
const WEAK_CIPHER_NAME_PATTERN = /\b(?:DES|RC4|Blowfish)\b/;

const CIPHER_CONTEXT_PATTERN = /\b(?:cipher|decipher|encrypt|decrypt|crypto)\b/i;

const UNSAFE_SIGNATURE_COMPARISON_PATTERN =
  /[A-Za-z_$][\w$.]*signature[\w$]*(?:\([^)]*\))?\s*(?:===?|!==?)\s*[A-Za-z_$][\w$.]*(?:\([^)]*\))?|[A-Za-z_$][\w$.]*(?:\([^)]*\))?\s*(?:===?|!==?)\s*[A-Za-z_$][\w$.]*signature[\w$]*(?:\([^)]*\))?/i;

// `signature !== PluginSignatureStatus.valid` compares enum/status members,
// not digest values — a PascalCase comparand names a type-level constant.
const ENUM_MEMBER_COMPARAND_PATTERN =
  /(?:===?|!==?)\s*[A-Z][a-z]|^[A-Z][a-z][\w$.]*(?:\([^)]*\))?\s*(?:===?|!==?)/;

const TIMING_SAFE_COMPARISON_PATTERN = /timingSafeEqual|timing.?safe/i;

// Gravatar hashes are md5-by-protocol; flagging them teaches users to ignore
// the rule.
const GRAVATAR_CONTEXT_PATTERN = /gravatar/i;

// No bare `key` (React key props) or `hash` (location.hash, hash maps) —
// both turn every component file with Math.random into a hit. No word
// boundaries: the context word usually sits inside a camelCase identifier
// (`sessionToken`), and the same-line requirement bounds the blast radius.
const SECURITY_RANDOM_CONTEXT_PATTERN = /token|secret|password|nonce|salt|csrf|credential|otp/i;

const MATH_RANDOM_CALL_PATTERN = /Math\.random\s*\(/g;

const SECURITY_CONTEXT_WINDOW_CHARS = 250;

// File-level co-occurrence is a trap: any OAuth service mentions `token`
// somewhere, so the context word must sit near the flagged call itself.
const findMatchIndexNearContext = (
  content: string,
  pattern: RegExp,
  contextPattern: RegExp,
  excludeContextPattern?: RegExp,
): number => {
  for (const callMatch of content.matchAll(pattern)) {
    const surroundingText = content.slice(
      Math.max(0, callMatch.index - SECURITY_CONTEXT_WINDOW_CHARS),
      callMatch.index + SECURITY_CONTEXT_WINDOW_CHARS,
    );
    if (!contextPattern.test(surroundingText)) continue;
    if (excludeContextPattern?.test(surroundingText)) continue;
    return callMatch.index;
  }
  return -1;
};

// A 250-char window around Math.random still bleeds across statements (LLM
// "tokens" streamed with jittered delays); the security word must share the
// statement that consumes the random value.
const findRandomCallIndexWithSameLineContext = (
  content: string,
  pattern: RegExp,
  contextPattern: RegExp,
): number => {
  for (const callMatch of content.matchAll(pattern)) {
    const lineStartIndex = content.lastIndexOf("\n", callMatch.index) + 1;
    const lineEndCandidate = content.indexOf("\n", callMatch.index);
    const lineEndIndex = lineEndCandidate < 0 ? content.length : lineEndCandidate;
    if (contextPattern.test(content.slice(lineStartIndex, lineEndIndex))) return callMatch.index;
  }
  return -1;
};

export const insecureCryptoRisk = defineRule({
  id: "insecure-crypto-risk",
  title: "Weak cryptography in security context",
  severity: "warn",
  recommendation:
    "Use modern primitives, `crypto.randomBytes` / Web Crypto randomness, and timing-safe comparisons for signatures, digests, tokens, and auth material.",
  scan: (file) => {
    if (!isProductionSourcePath(file.relativePath)) return [];

    let matchIndex = findMatchIndexNearContext(
      file.content,
      WEAK_HASH_PATTERN,
      SECURITY_CONTEXT_PATTERN,
      GRAVATAR_CONTEXT_PATTERN,
    );
    if (matchIndex < 0) matchIndex = file.content.search(WEAK_CIPHER_ALGORITHM_PATTERN);
    if (matchIndex < 0) matchIndex = file.content.search(DEPRECATED_CIPHER_API_PATTERN);
    if (matchIndex < 0 && CIPHER_CONTEXT_PATTERN.test(file.content)) {
      matchIndex = file.content.search(WEAK_CIPHER_NAME_PATTERN);
    }
    if (matchIndex < 0 && !TIMING_SAFE_COMPARISON_PATTERN.test(file.content)) {
      const comparisonMatch = UNSAFE_SIGNATURE_COMPARISON_PATTERN.exec(file.content);
      if (comparisonMatch !== null && !ENUM_MEMBER_COMPARAND_PATTERN.test(comparisonMatch[0])) {
        matchIndex = comparisonMatch.index;
      }
    }
    if (matchIndex < 0) {
      matchIndex = findRandomCallIndexWithSameLineContext(
        file.content,
        MATH_RANDOM_CALL_PATTERN,
        SECURITY_RANDOM_CONTEXT_PATTERN,
      );
    }
    if (matchIndex < 0) return [];

    const location = getLocationAtIndex(file.content, matchIndex);
    const finding: ScanFinding = {
      message:
        "Code uses weak hashes, deprecated ciphers, timing-unsafe comparisons, or Math.random in a security-shaped context.",
      line: location.line,
      column: location.column,
    };
    return [finding];
  },
});
