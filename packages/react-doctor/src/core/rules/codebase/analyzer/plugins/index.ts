import { existsSync } from "node:fs";
import path from "node:path";
import type { CodebasePlugin, CodebasePluginResult } from "./types.js";
import type { WorkspaceInfo } from "../types.js";

const createEmptyPluginResult = (): CodebasePluginResult => ({
  entryPatterns: [],
  alwaysUsedPatterns: [],
  usedExports: new Map(),
  toolingDependencies: new Set(),
  virtualModulePrefixes: [],
  generatedImportSuffixes: [],
});

const builtInPlugins: CodebasePlugin[] = [
  {
    name: "nextjs",
    enablers: ["next"],
    entryPatterns: [
      "{src/,}app/**/page.{js,jsx,ts,tsx}",
      "{src/,}app/**/layout.{js,jsx,ts,tsx}",
      "{src/,}app/**/route.{js,ts}",
      "{src/,}app/**/not-found.{js,jsx,ts,tsx}",
      "{src/,}app/**/error.{js,jsx,ts,tsx}",
      "{src/,}app/**/global-error.{js,jsx,ts,tsx}",
      "{src/,}app/**/loading.{js,jsx,ts,tsx}",
      "{src/,}app/**/template.{js,jsx,ts,tsx}",
      "{src/,}app/**/default.{js,jsx,ts,tsx}",
      "{src/,}app/**/opengraph-image.{js,jsx,ts,tsx}",
      "{src/,}app/**/twitter-image.{js,jsx,ts,tsx}",
      "{src/,}app/**/icon.{js,jsx,ts,tsx}",
      "{src/,}app/**/apple-icon.{js,jsx,ts,tsx}",
      "{src/,}app/**/sitemap.{js,ts}",
      "{src/,}app/**/robots.{js,ts}",
      "{src/,}app/**/manifest.{js,ts}",
      "{src/,}pages/**/*.{js,jsx,ts,tsx}",
      "next.config.{js,mjs,cjs,ts}",
    ],
    entryRole: "runtime",
    alwaysUsedPatterns: [
      "{src/,}middleware.{js,ts}",
      "{src/,}instrumentation.{js,ts}",
      "{src/,}instrumentation-client.{js,ts}",
      "{src/,}mdx-components.{js,jsx,ts,tsx}",
      // Next.js loads `sentry.{client,server,edge}.config.{js,ts}` automatically
      // when @sentry/nextjs is configured; user code never imports them.
      "sentry.{client,server,edge}.config.{js,mjs,cjs,ts}",
    ],
    toolingDependencies: ["next", "react", "react-dom"],
    usedExports: [
      {
        pattern:
          "{src/,}app/**/{page,layout,route,not-found,error,global-error,loading,template,default}.{js,jsx,ts,tsx}",
        exports: [
          "default",
          "metadata",
          "generateMetadata",
          "generateStaticParams",
          "generateViewport",
          "viewport",
          "config",
          "dynamic",
          "dynamicParams",
          "fetchCache",
          "maxDuration",
          "preferredRegion",
          "revalidate",
          "runtime",
          "experimental_ppr",
          "GET",
          "POST",
          "PUT",
          "PATCH",
          "DELETE",
          "HEAD",
          "OPTIONS",
        ],
      },
      {
        pattern: "{src/,}app/**/{opengraph-image,twitter-image,icon,apple-icon}.{js,jsx,ts,tsx}",
        exports: ["default", "alt", "size", "contentType", "generateImageMetadata"],
      },
      {
        pattern: "{src/,}app/**/{sitemap,robots,manifest}.{js,ts}",
        exports: ["default"],
      },
      {
        pattern: "{src/,}pages/**/*.{js,jsx,ts,tsx}",
        exports: [
          "default",
          "getStaticProps",
          "getStaticPaths",
          "getServerSideProps",
          "config",
          "reportWebVitals",
        ],
      },
      {
        pattern: "{src/,}middleware.{js,ts}",
        exports: ["default", "middleware", "config"],
      },
      {
        pattern: "{src/,}instrumentation.{js,ts}",
        exports: ["register", "onRequestError"],
      },
      {
        pattern: "{src/,}instrumentation-client.{js,ts}",
        exports: ["onRouterTransitionStart"],
      },
      {
        pattern: "next.config.{js,mjs,cjs,ts}",
        exports: ["default"],
      },
    ],
    generatedImportSuffixes: ["/$types"],
    virtualModulePrefixes: ["@/."],
  },
  {
    name: "vite",
    enablers: ["vite"],
    entryPatterns: ["index.html", "src/main.{js,jsx,ts,tsx}", "vite.config.{js,mjs,cjs,ts}"],
    entryRole: "runtime",
    toolingDependencies: ["vite"],
    virtualModulePrefixes: ["virtual:"],
  },
  {
    name: "vitest",
    enablers: ["vitest"],
    entryPatterns: ["**/*.{test,spec}.{js,jsx,ts,tsx}", "vitest.config.{js,mjs,cjs,ts}"],
    entryRole: "test",
    toolingDependencies: ["vitest"],
  },
  {
    name: "jest",
    enablers: ["jest", "ts-jest", "@jest/"],
    entryPatterns: ["**/*.{test,spec}.{js,jsx,ts,tsx}", "jest.config.{js,mjs,cjs,ts}"],
    entryRole: "test",
    toolingDependencies: ["jest", "ts-jest"],
  },
  {
    name: "eslint",
    enablers: ["eslint", "@eslint/"],
    entryPatterns: ["eslint.config.{js,mjs,cjs,ts}"],
    entryRole: "support",
    toolingDependencies: ["eslint"],
    usedExports: [{ pattern: "eslint.config.{js,mjs,cjs,ts}", exports: ["default"] }],
  },
  {
    name: "tailwindcss",
    enablers: ["tailwindcss", "@tailwindcss/postcss", "@tailwindcss/vite", "@tailwindcss/cli"],
    entryPatterns: ["tailwind.config.{js,mjs,cjs,ts}"],
    entryRole: "support",
    toolingDependencies: [
      "tailwindcss",
      "@tailwindcss/postcss",
      "@tailwindcss/vite",
      "@tailwindcss/cli",
    ],
    usedExports: [{ pattern: "tailwind.config.{js,mjs,cjs,ts}", exports: ["default"] }],
  },
  {
    name: "postcss",
    enablers: ["postcss", "@tailwindcss/postcss"],
    entryPatterns: ["postcss.config.{js,mjs,cjs,ts}"],
    entryRole: "support",
    toolingDependencies: ["postcss"],
    usedExports: [{ pattern: "postcss.config.{js,mjs,cjs,ts}", exports: ["default"] }],
  },
  {
    name: "playwright",
    enablers: ["@playwright/test", "playwright"],
    entryPatterns: ["playwright.config.{js,mjs,cjs,ts}"],
    entryRole: "support",
    toolingDependencies: ["@playwright/test", "playwright"],
    usedExports: [{ pattern: "playwright.config.{js,mjs,cjs,ts}", exports: ["default"] }],
  },
  {
    name: "tsup",
    enablers: ["tsup"],
    entryPatterns: ["tsup.config.{js,mjs,cjs,ts}"],
    entryRole: "support",
    toolingDependencies: ["tsup"],
    usedExports: [{ pattern: "tsup.config.{js,mjs,cjs,ts}", exports: ["default"] }],
  },
  {
    // shadcn/ui generates registry-installed component files under
    // `components/ui/` (or the user-configured alias). The user only
    // imports the top-level component (`Sidebar`, `Dialog`, ...) — many of
    // the named sub-component exports (`SidebarHeader`, `DialogTrigger`,
    // ...) ship intentionally over-exported as part of the design-system
    // surface, so we exempt the whole directory from dead-code analysis.
    name: "shadcn",
    enablers: [],
    isEnabled: (workspace: WorkspaceInfo) =>
      existsSync(path.join(workspace.directory, "components.json")),
    entryPatterns: [],
    entryRole: "support",
    alwaysUsedPatterns: ["{src/,}components/ui/**/*.{js,jsx,ts,tsx}"],
    toolingDependencies: [],
  },
  {
    name: "storybook",
    enablers: ["storybook", "@storybook/"],
    entryPatterns: ["**/*.stories.{js,jsx,ts,tsx}", ".storybook/**/*.{js,jsx,ts,tsx}"],
    entryRole: "support",
    toolingDependencies: ["storybook"],
  },
  {
    name: "tanstack-start",
    enablers: ["@tanstack/react-start", "@tanstack/start"],
    entryPatterns: ["app/routes/**/*.{js,jsx,ts,tsx}", "src/routes/**/*.{js,jsx,ts,tsx}"],
    entryRole: "runtime",
    toolingDependencies: ["@tanstack/react-start"],
  },
  {
    name: "react-native",
    enablers: ["react-native", "expo"],
    entryPatterns: ["App.{js,jsx,ts,tsx}", "app/**/*.{js,jsx,ts,tsx}", "index.{js,jsx,ts,tsx}"],
    entryRole: "runtime",
    toolingDependencies: ["react-native", "expo"],
  },
];

const isPluginEnabled = (plugin: CodebasePlugin, workspace: WorkspaceInfo): boolean => {
  if (plugin.isEnabled?.(workspace)) return true;
  return plugin.enablers.some((enabler) => {
    if (enabler.endsWith("/")) {
      return [...workspace.dependencyNames].some((dependencyName) =>
        dependencyName.startsWith(enabler),
      );
    }
    return workspace.dependencyNames.has(enabler);
  });
};

const mergePluginResult = (
  target: CodebasePluginResult,
  plugin: CodebasePlugin,
  workspace: WorkspaceInfo,
): void => {
  target.entryPatterns.push(
    ...plugin.entryPatterns.map((pattern) => ({ pattern, role: plugin.entryRole })),
  );
  target.alwaysUsedPatterns.push(...(plugin.alwaysUsedPatterns ?? []));
  target.virtualModulePrefixes.push(...(plugin.virtualModulePrefixes ?? []));
  target.generatedImportSuffixes.push(...(plugin.generatedImportSuffixes ?? []));
  for (const dependencyName of plugin.toolingDependencies ?? []) {
    target.toolingDependencies.add(dependencyName);
  }
  for (const usedExportRule of plugin.usedExports ?? []) {
    target.usedExports.set(usedExportRule.pattern, new Set(usedExportRule.exports));
  }
  const packageJsonResult = plugin.resolvePackageJson?.(workspace.manifest);
  if (!packageJsonResult) return;
  target.entryPatterns.push(...packageJsonResult.entryPatterns);
  target.alwaysUsedPatterns.push(...packageJsonResult.alwaysUsedPatterns);
  target.virtualModulePrefixes.push(...packageJsonResult.virtualModulePrefixes);
  target.generatedImportSuffixes.push(...packageJsonResult.generatedImportSuffixes);
  for (const dependencyName of packageJsonResult.toolingDependencies) {
    target.toolingDependencies.add(dependencyName);
  }
  for (const [pattern, exportNames] of packageJsonResult.usedExports) {
    target.usedExports.set(pattern, exportNames);
  }
};

export const runCodebasePlugins = (
  workspaces: WorkspaceInfo[],
): Map<number, CodebasePluginResult> => {
  const results = new Map<number, CodebasePluginResult>();
  for (const workspace of workspaces) {
    const result = createEmptyPluginResult();
    for (const plugin of builtInPlugins) {
      if (isPluginEnabled(plugin, workspace)) {
        mergePluginResult(result, plugin, workspace);
      }
    }
    results.set(workspace.id, result);
  }
  return results;
};
