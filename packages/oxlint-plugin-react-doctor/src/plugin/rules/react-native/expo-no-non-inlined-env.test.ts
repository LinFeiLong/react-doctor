import { describe, expect, it } from "vite-plus/test";
import { runRule } from "../../../test-utils/run-rule.js";
import { expoNoNonInlinedEnv } from "./expo-no-non-inlined-env.js";

const appFile = { filename: "src/screens/Home.tsx" };

describe("expo-no-non-inlined-env", () => {
  it("flags computed process.env[...] access", () => {
    const code = `const url = process.env["EXPO_PUBLIC_API_URL"];`;
    const result = runRule(expoNoNonInlinedEnv, code, appFile);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].message).toContain("Computed");
  });

  it("flags computed process.env[variable] access", () => {
    const code = `const value = process.env[key];`;
    const result = runRule(expoNoNonInlinedEnv, code, appFile);
    expect(result.diagnostics).toHaveLength(1);
  });

  it("flags destructuring of process.env", () => {
    const code = `const { EXPO_PUBLIC_API_URL } = process.env;`;
    const result = runRule(expoNoNonInlinedEnv, code, appFile);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].message).toContain("Destructuring");
  });

  it("does NOT flag static dotted access", () => {
    const code = `const url = process.env.EXPO_PUBLIC_API_URL;`;
    const result = runRule(expoNoNonInlinedEnv, code, appFile);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("does NOT flag aliasing the whole env object", () => {
    const code = `const env = process.env;`;
    const result = runRule(expoNoNonInlinedEnv, code, appFile);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("does NOT flag computed access on an unrelated object", () => {
    const code = `const v = config.env[key];`;
    const result = runRule(expoNoNonInlinedEnv, code, appFile);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("does NOT flag in *.config.js (Node/build context)", () => {
    const code = `const { NODE_ENV } = process.env; const x = process.env[key];`;
    const result = runRule(expoNoNonInlinedEnv, code, { filename: "babel.config.js" });
    expect(result.diagnostics).toHaveLength(0);
  });

  it("does NOT flag in scripts/ (tooling context)", () => {
    const code = `const value = process.env[key];`;
    const result = runRule(expoNoNonInlinedEnv, code, { filename: "scripts/build.ts" });
    expect(result.diagnostics).toHaveLength(0);
  });

  it("does NOT flag in an Expo Router API route (+api)", () => {
    const code = `const { SECRET } = process.env;`;
    const result = runRule(expoNoNonInlinedEnv, code, { filename: "app/hello+api.ts" });
    expect(result.diagnostics).toHaveLength(0);
  });

  it("does NOT flag in test files", () => {
    const code = `const value = process.env[key];`;
    const result = runRule(expoNoNonInlinedEnv, code, { filename: "src/Home.test.ts" });
    expect(result.diagnostics).toHaveLength(0);
  });
});
