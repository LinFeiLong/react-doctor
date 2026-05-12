import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: [
    {
      entry: { cli: "./src/cli/index.ts" },
      dts: true,
      target: "node22",
      platform: "node",
      env: {
        VERSION: process.env.VERSION ?? "0.0.0",
      },
      fixedExtension: false,
    },
    {
      entry: {
        sdk: "./src/sdk/index.ts",
        compat: "./src/sdk/compat.ts",
      },
      dts: true,
      target: "node22",
      platform: "node",
      fixedExtension: false,
    },
  ],
});
