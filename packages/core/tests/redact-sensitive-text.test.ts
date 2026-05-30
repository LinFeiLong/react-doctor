import { describe, expect, it } from "vite-plus/test";
import { REDACTED_PLACEHOLDER, redactSensitiveText } from "@react-doctor/core";

describe("redactSensitiveText", () => {
  it("returns empty input unchanged", () => {
    expect(redactSensitiveText("")).toBe("");
  });

  it("leaves ordinary diagnostic prose untouched", () => {
    const messages = [
      "useState initialized from prop",
      "useContext is superseded by `use()`",
      "forwardRef is no longer needed on React 19+",
      "Avoid calling setState inside useEffect (line 12:4)",
      "Move secrets to server-only code",
    ];
    for (const message of messages) {
      expect(redactSensitiveText(message)).toBe(message);
    }
  });

  it("redacts an AWS access key id", () => {
    expect(redactSensitiveText("key AKIAIOSFODNN7EXAMPLE found")).toBe(
      `key ${REDACTED_PLACEHOLDER} found`,
    );
  });

  it("redacts GitHub personal access tokens", () => {
    const token = `ghp_${"a".repeat(36)}`;
    expect(redactSensitiveText(`token: ${token}`)).toBe(`token: ${REDACTED_PLACEHOLDER}`);
  });

  it("redacts Stripe live keys", () => {
    expect(redactSensitiveText(`useState("sk_live_${"4".repeat(20)}")`)).toContain(
      REDACTED_PLACEHOLDER,
    );
    expect(redactSensitiveText(`useState("sk_live_${"4".repeat(20)}")`)).not.toContain("sk_live_");
  });

  it("redacts OpenAI-style sk- keys", () => {
    const key = `sk-${"A1b2".repeat(10)}`;
    expect(redactSensitiveText(`const apiKey = "${key}"`)).toBe(
      `const apiKey = "${REDACTED_PLACEHOLDER}"`,
    );
  });

  it("redacts a JWT", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N";
    expect(redactSensitiveText(`Authorization header ${jwt}`)).toBe(
      `Authorization header ${REDACTED_PLACEHOLDER}`,
    );
  });

  it("masks credentials inside a URL but keeps scheme and host", () => {
    expect(redactSensitiveText("postgres://admin:hunter2pass@db.internal:5432/app")).toBe(
      `postgres://${REDACTED_PLACEHOLDER}@db.internal:5432/app`,
    );
  });

  it("redacts a bearer token but keeps the scheme word", () => {
    const result = redactSensitiveText("Authorization: Bearer abcDEF123456ghijKLmnop");
    expect(result).toBe(`Authorization: Bearer ${REDACTED_PLACEHOLDER}`);
  });

  it("redacts email addresses (PII)", () => {
    expect(redactSensitiveText('useState("jane.doe@example.com")')).toBe(
      `useState("${REDACTED_PLACEHOLDER}")`,
    );
  });

  it("redacts a PEM private key block", () => {
    const pem = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA\n-----END RSA PRIVATE KEY-----";
    expect(redactSensitiveText(`key: ${pem}`)).toBe(`key: ${REDACTED_PLACEHOLDER}`);
  });

  it("redacts an unprefixed high-entropy token", () => {
    const token = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(redactSensitiveText(`token=${token}`)).toBe(`token=${REDACTED_PLACEHOLDER}`);
  });

  it("does not redact ordinary long identifiers without digits", () => {
    const identifier = "someVeryDescriptiveComponentDisplayName";
    expect(redactSensitiveText(identifier)).toBe(identifier);
  });

  it("does not redact short alphanumeric tokens", () => {
    expect(redactSensitiveText("status code 404 at offset 12ab")).toBe(
      "status code 404 at offset 12ab",
    );
  });

  it("is idempotent", () => {
    const once = redactSensitiveText("ghp_" + "z".repeat(36));
    expect(redactSensitiveText(once)).toBe(once);
  });
});
