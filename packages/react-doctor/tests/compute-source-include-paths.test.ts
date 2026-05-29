import { describe, expect, it } from "vite-plus/test";
import { computeSourceIncludePaths } from "@react-doctor/core";

describe("computeSourceIncludePaths", () => {
  it("returns undefined for empty include paths", () => {
    expect(computeSourceIncludePaths([])).toBeUndefined();
  });

  it("keeps every TS/JS source extension (.ts, .tsx, .js, .jsx)", () => {
    const paths = ["src/app.tsx", "src/utils.ts", "src/Button.jsx", "src/config.js"];
    expect(computeSourceIncludePaths(paths)).toEqual(paths);
  });

  it("drops non-source files", () => {
    const paths = ["src/app.tsx", "README.md", "src/styles.css", "data.json"];
    expect(computeSourceIncludePaths(paths)).toEqual(["src/app.tsx"]);
  });

  it("returns empty array when no source files exist", () => {
    const paths = ["README.md", "package.json"];
    expect(computeSourceIncludePaths(paths)).toEqual([]);
  });
});
