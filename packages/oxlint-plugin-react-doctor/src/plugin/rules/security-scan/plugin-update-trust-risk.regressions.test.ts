import { describe, expect, it } from "vite-plus/test";
import { runScanRule } from "../../../test-utils/run-scan-rule.js";
import { pluginUpdateTrustRisk } from "./plugin-update-trust-risk.js";

describe("security-scan/plugin-update-trust-risk — regressions", () => {
  it("stays silent on a plain download link near an https URL", () => {
    const findings = runScanRule(pluginUpdateTrustRisk, {
      relativePath: "src/components/download-button.tsx",
      content: `const downloadHref = "https://example.com/exports/report.csv";\nexport const DownloadButton = () => <a href={downloadHref}>Download</a>;\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("flags an updater downloading and unpacking an executable artifact", () => {
    const findings = runScanRule(pluginUpdateTrustRisk, {
      relativePath: "src/updater.ts",
      content: `import { spawnSync } from "node:child_process";\nconst updateUrl = await fetchLatestRelease();\nawait downloadFile(updateUrl, "/tmp/update.zip");\nspawnSync("unzip", ["/tmp/update.zip"]);\n`,
    });
    expect(findings).toHaveLength(1);
  });

  it("stays silent on install instructions only displayed in UI copy", () => {
    const findings = runScanRule(pluginUpdateTrustRisk, {
      relativePath: "src/onboarding/install-step.tsx",
      content: `export const InstallStep = () => (\n  <CodeSnippet>{"curl --proto '=https' -LsSf https://example.com/cli-installer.sh | sh"}</CodeSnippet>\n);\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on install-command constants that are never executed", () => {
    const findings = runScanRule(pluginUpdateTrustRisk, {
      relativePath: "src/types/agent.ts",
      content: `export const CLI_INSTALL_COMMANDS = [\n  "curl -fsSL https://claude.ai/install.sh | bash",\n  "brew install --cask claude-code",\n] as const;\n`,
    });
    expect(findings).toHaveLength(0);
  });
});
