# What is a score?

The React Doctor score is a 0-100 health signal for a scan result.

It summarizes the diagnostics that count toward the `score` surface. Weak-signal findings, such as design cleanup, can be excluded from score by default so the number focuses on meaningful React issues.

## How to read it

Use the score as a trend, not as the only source of truth.

- A higher score usually means fewer or less severe issues.
- A lower score means React Doctor found more risk.
- A small score change may matter less than a new high-severity diagnostic.

## Local scans

When network access is available, the CLI can compute a score and show the result in the terminal output.

Use `--offline` to skip score calculation entirely:

```bash
npx react-doctor@latest --offline
```

## CI scans

In CI, you can choose between two gates:

- Diagnostic gate: use `--fail-on error`, `--fail-on warning`, or `--fail-on none`.
- Score gate: read the GitHub Action `score` output in a follow-up step.

For most teams, start with diagnostics and only add a score floor after the project has a stable baseline.
