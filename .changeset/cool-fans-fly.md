---
"react-doctor": patch
"@react-doctor/core": patch
"oxlint-plugin-react-doctor": patch
---

Add a project-level security file scan: 36 first-class scan rules (leaked artifact secrets and env dumps, permissive Firebase/Supabase rules, raw SQL injection risk, unsafe webhook signature comparisons, committed private key material, public debug artifacts, …) ship in the oxlint plugin as `defineScanRule` modules and run in `@react-doctor/core`'s environment-check phase over one bounded whole-tree walk — covering shipped bundles, dotenv/config files, SQL, and Firebase rules files that per-file linting never sees.

Scan rules register metadata (id, title, severity, recommendation, `Security` category, `security-scan` tag) like any other rule but carry a project-level `scan` instead of AST visitors, so their findings flow through the standard diagnostic pipeline: per-rule and per-category severity overrides, inline disables, and output `surfaces` now apply to scan-rule diagnostics, and `react-doctor rules ignore-tag security-scan` (config `ignore.tags`) silences the whole family. They never appear in generated oxlint configs or the ESLint presets — they only execute through React Doctor's scan. A plain `--diff` / `--staged` scan skips them like the other whole-project checks, and the gate is now diff mode itself rather than the presence of include paths, so projects configuring `ignore.files` get the security scan too.
