import { describe, expect, it } from "vite-plus/test";
import { isLintableSourceFile } from "../src/utils/is-lintable-source-file.js";

describe("isLintableSourceFile", () => {
  it("accepts ordinary JS/TS source files", () => {
    for (const filePath of [
      "src/App.tsx",
      "src/index.ts",
      "components/Button.jsx",
      "lib/util.js",
      "deep/nested/path/Widget.tsx",
    ]) {
      expect(isLintableSourceFile(filePath), filePath).toBe(true);
    }
  });

  it("rejects non-source files (including .cjs/.mjs, which are never linted)", () => {
    for (const filePath of [
      "styles.css",
      "README.md",
      "data.json",
      "logo.svg",
      "scripts/build.cjs",
      "scripts/build.mjs",
    ]) {
      expect(isLintableSourceFile(filePath), filePath).toBe(false);
    }
  });

  it("rejects generated IIFE / UMD-global `.js` bundles (the default ignore)", () => {
    for (const filePath of [
      "public/budge.iife.js",
      "public/sdk.global.js",
      "nested/dir/embed.IIFE.js",
    ]) {
      expect(isLintableSourceFile(filePath), filePath).toBe(false);
    }
  });

  it("does not over-match files that merely contain 'iife' or 'global' in the name", () => {
    for (const filePath of [
      "src/iife-helpers.ts",
      "src/global-state.ts",
      "src/useGlobalStore.tsx",
    ]) {
      expect(isLintableSourceFile(filePath), filePath).toBe(true);
    }
  });
});
