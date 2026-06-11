import { describe, expect, it } from "vite-plus/test";
import { runScanRule } from "../../../test-utils/run-scan-rule.js";
import { rawSqlInjectionRisk } from "./raw-sql-injection-risk.js";

describe("security-scan/raw-sql-injection-risk — regressions", () => {
  it("stays silent on Prisma.raw with a pure string literal", () => {
    const findings = runScanRule(rawSqlInjectionRisk, {
      relativePath: "src/server/filter-to-prisma.ts",
      content: `return Prisma.join([Prisma.raw("AND "), sql], "");\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on whereRaw with driver-side parameter binding", () => {
    const findings = runScanRule(rawSqlInjectionRisk, {
      relativePath: "src/server/services/sessions.ts",
      content: `builder\n  .whereRaw("e.session_id = {sessionId: String}", { sessionId: props.sessionId })\n  .whereRaw("e.is_deleted = 0");\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent when query interpolations are wrapped in a sanitizer", () => {
    const findings = runScanRule(rawSqlInjectionRisk, {
      relativePath: "src/crm/service.ts",
      content:
        "const result = await conn.query(`SELECT Id FROM User WHERE Email = '${this.sanitizeSoqlValue(email)}' LIMIT 1`);\n",
    });
    expect(findings).toHaveLength(0);
  });

  it("flags queryRawUnsafe escape hatches", () => {
    const findings = runScanRule(rawSqlInjectionRisk, {
      relativePath: "src/raw-sql.ts",
      content:
        "export const q = (prisma, id) => prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = '${id}'`);\n",
    });
    expect(findings).toHaveLength(1);
  });

  it("flags Prisma.raw built from interpolation", () => {
    const findings = runScanRule(rawSqlInjectionRisk, {
      relativePath: "src/server/order-by.ts",
      content: "return Prisma.raw(`ORDER BY ${column} ${direction}`);\n",
    });
    expect(findings).toHaveLength(1);
  });

  it("flags whereRaw built from interpolation", () => {
    const findings = runScanRule(rawSqlInjectionRisk, {
      relativePath: "src/server/query.ts",
      content: "builder.whereRaw(`tenant_id = '${tenantId}'`);\n",
    });
    expect(findings).toHaveLength(1);
  });
});
