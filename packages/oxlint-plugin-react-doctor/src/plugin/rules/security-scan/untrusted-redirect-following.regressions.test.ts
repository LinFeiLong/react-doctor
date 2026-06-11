import { describe, expect, it } from "vite-plus/test";
import { runScanRule } from "../../../test-utils/run-scan-rule.js";
import { untrustedRedirectFollowing } from "./untrusted-redirect-following.js";

describe("security-scan/untrusted-redirect-following — regressions", () => {
  it("stays silent when a url variable is built from internal config", () => {
    const findings = runScanRule(untrustedRedirectFollowing, {
      relativePath: "server/routers/admin/create-coupon.ts",
      content: `const url = \`\${LICENSE_API_BASE}/v1/coupons\`;\nreturn await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on generic fetch wrappers that accept a url parameter", () => {
    const findings = runScanRule(untrustedRedirectFollowing, {
      relativePath: "src/lib/api/fetch-with-timeout.ts",
      content: `export async function fetchWithTimeout(url, init, options) {\n  const response = await fetch(url, { ...init, signal: controller.signal });\n  return response;\n}\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("stays silent on Durable Object stub fetches of the inbound request url", () => {
    const findings = runScanRule(untrustedRedirectFollowing, {
      relativePath: "worker/routes/stream.ts",
      content: `const durableObjectStub = env.AGENT_DURABLE_OBJECT.get(id);\nconst response = await durableObjectStub.fetch(request.url, { method: "POST" });\n`,
    });
    expect(findings).toHaveLength(0);
  });

  it("flags fetches of a url read directly from the request", () => {
    const findings = runScanRule(untrustedRedirectFollowing, {
      relativePath: "app/api/preview/route.ts",
      content: `export const GET = (request) => fetch(request.nextUrl.searchParams.get("url"));\n`,
    });
    expect(findings).toHaveLength(1);
  });

  it("flags fetches of a url destructured from the request body", () => {
    const findings = runScanRule(untrustedRedirectFollowing, {
      relativePath: "app/api/preview/route.ts",
      content: `export const POST = async (request) => {\n  const { imageUrl } = await request.json();\n  return fetch(imageUrl);\n};\n`,
    });
    expect(findings).toHaveLength(1);
  });

  it("stays silent when the request-sourced fetch disables redirect following", () => {
    const findings = runScanRule(untrustedRedirectFollowing, {
      relativePath: "app/api/preview/route.ts",
      content: `export const POST = async (request) => {\n  const { imageUrl } = await request.json();\n  return fetch(imageUrl, { redirect: "manual" });\n};\n`,
    });
    expect(findings).toHaveLength(0);
  });
});
