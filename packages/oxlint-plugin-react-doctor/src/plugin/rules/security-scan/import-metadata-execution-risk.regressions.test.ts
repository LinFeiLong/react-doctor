import { describe, expect, it } from "vite-plus/test";
import { runScanRule } from "../../../test-utils/run-scan-rule.js";
import { importMetadataExecutionRisk } from "./import-metadata-execution-risk.js";

describe("security-scan/import-metadata-execution-risk — regressions", () => {
  it("stays silent on a child_process import followed by other imports (cal.com auto-migrations shape)", () => {
    const findings = runScanRule(importMetadataExecutionRisk, {
      relativePath: "packages/prisma/auto-migrations.ts",
      content: `import { exec as execCb } from "node:child_process";\nimport { promisify } from "node:util";\n\nimport { getSchema } from "./schema";\n\nconst exec = promisify(execCb);\nawait exec("yarn prisma migrate deploy");\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("flags executing an uploaded archive inside the call statement", () => {
    const findings = runScanRule(importMetadataExecutionRisk, {
      relativePath: "src/server/import.ts",
      content: `import { exec } from "node:child_process";\n\nexport const importArchive = (uploadPath: string) => {\n  exec(\`unzip \${uploadPath} -d /tmp/import\`);\n};\n`,
    });
    expect(findings).toHaveLength(1);
  });

  it("stays silent when taint words only appear in quoted static arguments", () => {
    const findings = runScanRule(importMetadataExecutionRisk, {
      relativePath: "src/utils/cli-plugin.ts",
      content: `import { spawnSync } from "node:child_process";\n\nexport const installSkills = () =>\n  spawnSync("claude", ["plugin", "marketplace", "add", "acme/agent-skills"], { stdio: "inherit" });\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent when execution keywords only appear in comments", () => {
    const findings = runScanRule(importMetadataExecutionRisk, {
      relativePath: "src/sdk/connection.ts",
      content: `// Ajv compiles schemas via \`new Function(...)\`, which throws when the\n// MCP plugin runs inside a sandboxed worker.\nconst createClient = () => new Client(validatorOptions);\n`,
    });
    expect(findings).toHaveLength(0);
  });
});
