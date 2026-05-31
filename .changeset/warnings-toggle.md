---
"react-doctor": patch
---

Add a `--no-warnings` flag and `"warnings": false` config option to hide `warning`-severity diagnostics (errors always show). Warnings stay shown by default; `--warnings` / `"warnings": true` is the explicit default-on. The toggle is the master switch and runs after per-rule / per-category severity overrides, so a rule explicitly set to `"warn"` via `rules` / `categories` still shows even when warnings are hidden.
