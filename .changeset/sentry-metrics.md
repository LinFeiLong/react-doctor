---
"react-doctor": patch
---

Add anonymized Sentry Application Metrics (counters + distributions) to the CLI, alongside the existing crash reporting and tracing, so we can track reliability/performance and prioritize work.

- **Counters & distributions**: each run records `cli.invoked` (per command), `scan.completed`, `scan.duration`/`scan.files`/`scan.score`, `project.detected` (anonymous project shape), `rule.fired` (a per-rule counter keyed by `rule`/`plugin`/`category`/`severity`, so we can see which rules actually catch issues, which are noisy, and which never fire), `lint.failed`/`deadcode.failed`/`scan.check_skipped`/`score.unavailable`, `cli.error`, plus growth/activation signals on `install` (which coding agents, git hook, CI workflow, agent hooks, dependency outcome), the agent-handoff fix loop (`agent.handoff`), and `rules` config changes (`rules.changed`/`rules.queried`).
- **Trace-connected & enabled by default**: metrics use `Sentry.metrics.*` (SDK ≥ 10.25), flow independently of `SENTRY_TRACES_SAMPLE_RATE`, and carry the run snapshot + project shape as global scope attributes (the metrics analog of the per-event run tags).
- **Anonymized by default**: a `beforeSendMetric` hook drops the `server.address` hostname attribute and scrubs home-directory paths + known secrets from attribute values via the same redactor used for events, dropping the metric on failure. Attributes are enums/booleans/counts/rule names only — no source code or specific findings.
- **Opt-out unchanged**: `--no-score` (and its `--no-telemetry` alias) disables metrics along with crash reporting and tracing; metrics are skipped under test runs, and the programmatic `@react-doctor/api` library never initializes Sentry.
