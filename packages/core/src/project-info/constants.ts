export const SOURCE_FILE_PATTERN = /\.(tsx?|jsx?)$/;

// Bundler output — IIFE / UMD-global builds (e.g. tsup/rollup emitting
// `widget.iife.js` or `sdk.global.js`, often dropped into `public/`
// alongside real source rather than an ignored `dist/`) — is generated,
// usually minified, and not worth linting. Flagging a 17k-line
// `*.iife.js` bundle is pure noise, so these are excluded from every
// source-file scan by default. Only `.js` is matched: these formats are
// browser-global bundles, and `.cjs`/`.mjs` aren't source files anyway.
export const GENERATED_BUNDLE_FILE_PATTERN = /\.(iife|global)\.js$/i;

export const GIT_LS_FILES_MAX_BUFFER_BYTES = 50 * 1024 * 1024;

export const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "storybook-static",
]);
