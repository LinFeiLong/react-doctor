import { describe, expect, it } from "vite-plus/test";
import { runScanRule } from "../../../test-utils/run-scan-rule.js";
import { postmessageOriginRisk } from "./postmessage-origin-risk.js";

describe("security-scan/postmessage-origin-risk — regressions", () => {
  it("flags a message listener that reads event.data without an origin check", () => {
    const findings = runScanRule(postmessageOriginRisk, {
      relativePath: "src/widget.ts",
      content: `window.addEventListener("message", (event) => {\n  handleCommand(event.data);\n});\n`,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toBe(
      "A message event handler reads cross-window messages without an obvious origin check.",
    );
    expect(findings[0]?.line).toBe(1);
    // No per-finding overrides: severity/title come from the rule metadata.
    expect(findings[0]?.severity).toBeUndefined();
    expect(findings[0]?.title).toBeUndefined();
  });

  it("stays silent when the handler validates event.origin before reading event.data", () => {
    const findings = runScanRule(postmessageOriginRisk, {
      relativePath: "src/widget.ts",
      content: `window.addEventListener("message", (event) => {\n  if (event.origin !== "https://trusted.example.com") return;\n  handleCommand(event.data);\n});\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on non-production source paths even with the vulnerable shape", () => {
    const findings = runScanRule(postmessageOriginRisk, {
      relativePath: "src/__tests__/widget.test.ts",
      content: `window.addEventListener("message", (event) => {\n  handleCommand(event.data);\n});\n`,
    });
    expect(findings).toHaveLength(0);
  });
});
