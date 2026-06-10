import { describe, expect, it } from "vite-plus/test";
import { runScanRule } from "../../../test-utils/run-scan-rule.js";
import { activeStaticAsset } from "./active-static-asset.js";

describe("security-scan/active-static-asset — regressions", () => {
  it("escalates an active SVG in public assets via per-finding severity/title overrides", () => {
    const findings = runScanRule(activeStaticAsset, {
      relativePath: "public/logo.svg",
      content: `<svg xmlns="http://www.w3.org/2000/svg">\n  <script>alert(1)</script>\n</svg>\n`,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toBe(
      "A browser-reachable SVG contains script or event-handler code.",
    );
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.title).toBe("Active SVG in public assets");
    expect(findings[0]?.help).toBe(
      "Serve untrusted SVG as downloads, sanitize it, or isolate it on a cookieless asset origin with a restrictive CSP.",
    );
    expect(findings[0]?.line).toBe(2);
    expect(findings[0]?.column).toBe(3);
  });

  it("stays silent on an inert SVG in public assets", () => {
    const findings = runScanRule(activeStaticAsset, {
      relativePath: "public/logo.svg",
      content: `<svg xmlns="http://www.w3.org/2000/svg"><circle r="4" /></svg>\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("flags dangerouslyAllowSVG in config at the rule's default metadata (no overrides)", () => {
    const findings = runScanRule(activeStaticAsset, {
      relativePath: "next.config.ts",
      content: `const config = { images: { dangerouslyAllowSVG: true } };\nexport default config;\n`,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toBe(
      "The app enables or embeds SVG in an executable browser context.",
    );
    // Inherits the rule's "warn" / "Executable SVG exposure" metadata.
    expect(findings[0]?.severity).toBeUndefined();
    expect(findings[0]?.title).toBeUndefined();
    expect(activeStaticAsset.severity).toBe("warn");
    expect(activeStaticAsset.title).toBe("Executable SVG exposure");
  });

  it("flags an executable SVG embed in production source", () => {
    const findings = runScanRule(activeStaticAsset, {
      relativePath: "src/components/diagram.tsx",
      content: `export const Diagram = () => <object data="/uploads/diagram.svg" type="image/svg+xml" />;\n`,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBeUndefined();
  });
});
