import { describe, expect, it } from "vite-plus/test";
import { runPostureRule } from "../../../test-utils/run-posture-rule.js";
import { publicDebugArtifact } from "./public-debug-artifact.js";

describe("security-posture/public-debug-artifact — regressions", () => {
  it("flags a browser-reachable debug log at the rule's default severity", () => {
    const findings = runPostureRule(publicDebugArtifact, {
      relativePath: "public/debug.log",
      content: "request failed: GET /internal/admin 500\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toBe(
      "A browser-reachable debug, log, dump, report, or env artifact is present.",
    );
    // No severity override — the finding inherits the rule's "warn".
    expect(findings[0]?.severity).toBeUndefined();
    expect(publicDebugArtifact.severity).toBe("warn");
  });

  it('escalates to "error" via the per-finding override when the artifact carries a secret', () => {
    const findings = runPostureRule(publicDebugArtifact, {
      relativePath: "public/debug.log",
      content: "auth token: ghp_abcdefghijklmnopqrstuvwxyz0123456789\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("error");
  });

  it("stays silent on the same content outside a browser-reachable debug path", () => {
    const findings = runPostureRule(publicDebugArtifact, {
      relativePath: "logs/debug.log",
      content: "auth token: ghp_abcdefghijklmnopqrstuvwxyz0123456789\n",
    });
    expect(findings).toHaveLength(0);
  });
});
