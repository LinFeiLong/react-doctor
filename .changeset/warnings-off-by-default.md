---
"react-doctor": minor
---

Hide `warning`-severity diagnostics by default. Out of the box a scan now reports only `error`-severity findings on every surface — CLI output, PR comments, the score, the `--fail-on` CI gate, and the programmatic `inspect()` / `diagnose()` results and JSON report (so `warningCount` is `0` by default). Re-enable warnings globally with the new `--warnings` flag or `"warnings": true` in `react-doctor.config.json`, or individually by setting a specific rule / category to `"warn"` via the top-level `rules` / `categories` config (an explicit per-rule `"warn"` is treated as an opt-in and survives the global hide). Pass `--no-warnings` to force them off even when config enables them.

`--fail-on warning` (or `"failOn": "warning"`) now implies warnings are surfaced, so the CI gate still fails on warnings without also needing `--warnings`.
