#!/usr/bin/env node

import module from "node:module";

if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    module.enableCompileCache();
  } catch {
    // Ignore compile-cache errors.
  }
}

// Rewrite Error.stack with original-TypeScript positions from
// dist/cli.js.map, so uncaught errors reported to Sentry point at source
// files rather than the bundled dist/cli.js. This MUST run before the
// dist/cli.js import below: Node caches each module's sourcemap at compile
// time, so flipping this on from inside the already-loaded bundle would be
// too late for the bundle's own frames. Node then reads the map lazily on
// first stack access, so the happy path is free. Guarded like
// enableCompileCache above so a runtime without the API can't crash the CLI.
if (process.setSourceMapsEnabled) {
  process.setSourceMapsEnabled(true);
}

await import("../dist/cli.js");
