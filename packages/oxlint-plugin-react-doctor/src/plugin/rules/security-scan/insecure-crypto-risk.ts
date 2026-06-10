import { defineRule } from "../../utils/define-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";

const INSECURE_CRYPTO_PATTERN =
  /createHash\s*\(\s*["'](?:md5|sha1)["']|createCipher\s*\(|\b(?:DES|RC4|Blowfish)\b|\bmd5\s*\(|(?:===?|!==?)\s*.{0,40}\b(?:hmac|digest)\b|\b(?:hmac|digest)\b.{0,40}(?:===?|!==?)/i;

const UNSAFE_SIGNATURE_COMPARISON_PATTERN =
  /[A-Za-z_$][\w$.]*signature[\w$]*(?:\([^)]*\))?\s*(?:===?|!==?)\s*[A-Za-z_$][\w$.]*(?:\([^)]*\))?|[A-Za-z_$][\w$.]*(?:\([^)]*\))?\s*(?:===?|!==?)\s*[A-Za-z_$][\w$.]*signature[\w$]*(?:\([^)]*\))?/i;

const SECURITY_RANDOM_CONTEXT_PATTERN =
  /\b(?:token|secret|key|password|nonce|salt|session|csrf|auth|credential|hash)\b/i;

const MATH_RANDOM_CALL_PATTERN = /Math\.random\s*\(/;

export const insecureCryptoRisk = defineRule({
  id: "insecure-crypto-risk",
  title: "Weak cryptography in security context",
  severity: "warn",
  recommendation:
    "Use modern primitives, `crypto.randomBytes` / Web Crypto randomness, and timing-safe comparisons for signatures, digests, tokens, and auth material.",
  scan: (file) => {
    if (!isProductionSourcePath(file.relativePath)) return [];
    const hasInsecurePrimitive =
      INSECURE_CRYPTO_PATTERN.test(file.content) ||
      UNSAFE_SIGNATURE_COMPARISON_PATTERN.test(file.content);
    const hasSecurityRandom =
      SECURITY_RANDOM_CONTEXT_PATTERN.test(file.content) &&
      MATH_RANDOM_CALL_PATTERN.test(file.content);
    if (!hasInsecurePrimitive && !hasSecurityRandom) return [];

    let pattern = MATH_RANDOM_CALL_PATTERN;
    if (INSECURE_CRYPTO_PATTERN.test(file.content)) {
      pattern = INSECURE_CRYPTO_PATTERN;
    } else if (UNSAFE_SIGNATURE_COMPARISON_PATTERN.test(file.content)) {
      pattern = UNSAFE_SIGNATURE_COMPARISON_PATTERN;
    }

    const location = getMatchLocation(file.content, pattern);
    return [
      {
        message:
          "Code uses weak hashes, deprecated ciphers, timing-unsafe comparisons, or Math.random in a security-shaped context.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
