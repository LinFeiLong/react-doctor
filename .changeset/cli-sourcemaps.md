---
"react-doctor": patch
---

Ship an external sourcemap for the CLI bundle (`dist/cli.js.map`) and enable Node's source-map support in the `react-doctor` bin. Uncaught errors captured by Sentry now resolve to original-TypeScript source positions instead of bundled `dist/cli.js` offsets, making crash stack traces triage-able. The map is external (not inlined) and read lazily by Node only when a stack trace is materialized — i.e. on a crash — so the no-crash path has no added startup cost. Symbolication happens at runtime on the user's machine; no sourcemap upload step is involved.
