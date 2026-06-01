<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/react-doctor-readme-logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/react-doctor-readme-logo-light.svg">
  <img alt="React Doctor" src="./assets/react-doctor-readme-logo-light.svg" width="134" height="36">
</picture>

[![version](https://img.shields.io/npm/v/react-doctor?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-doctor)
[![downloads](https://img.shields.io/npm/dt/react-doctor.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-doctor)

Your agent writes bad React, this catches it.

React Doctor deterministically scans your codebase and finds issues across state & effects, performance, architecture, security, and accessibility.

Works for all React frameworks and libraries - Next.js, Vite, TanStack, React Native, Expo, you name it.

[Website →](https://react.doctor/docs)

## Install

### 1. Quick start

Run this at your project root to get an audit.

```bash
npx react-doctor@latest
```

https://github.com/user-attachments/assets/07cc88d9-9589-44c3-aa73-5d603cb1c570

### 2. Install for agents

Once you have an audit, you can install the skill for your coding agent to learn from the issues and fix them in the future.

```bash
npx react-doctor@latest install
```

Works with Claude Code, Cursor, Codex, OpenCode, and many more.

### 3. Run in CI (GitHub Actions) for your team

[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-React%20Doctor-000000?style=flat&labelColor=000000&logo=githubactions&logoColor=white)](https://github.com/marketplace/actions/react-doctor)

Add the reusable GitHub Action from Marketplace to scan every pull request, show inline annotations, and leave findings where reviewers already look.

```yaml
name: React Doctor

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  pull-requests: write
  issues: write

concurrency:
  group: react-doctor-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  react-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: millionco/react-doctor@main
```

[Add GitHub Action →](https://github.com/marketplace/actions/react-doctor)

### 4. Configure rules in `doctor.config.ts`

Configure with a `doctor.config.ts` (or `.js`, `.mjs`, `.cjs`, `.json`, `.jsonc`) in your project root.

```ts
// doctor.config.ts
import type { ReactDoctorConfig } from "react-doctor/api";

export default {
  lint: true,
  rules: {
    "react-doctor/no-array-index-as-key": "off",
  },
} satisfies ReactDoctorConfig;
```

Prefer JSON? Use `doctor.config.json`:

```jsonc
{
  "$schema": "https://react.doctor/schema/config.json",
  "lint": true,
}
```

## Telemetry

The CLI reports crashes, basic run traces, and anonymous usage counters to [Sentry](https://sentry.io) to help us fix bugs and prioritize what to build. Events and metrics include the version, platform, Node version, how the CLI was invoked (which command, package manager, and whether it ran locally vs. CI vs. a coding agent), the detected project shape (framework, React version, TypeScript, project size — never the contents of your files), which rules fired (rule names only, e.g. `react-doctor/no-array-index-as-key`, with counts — never your code or specific findings), and de-minified stack traces.

Telemetry is **anonymized** before it leaves your machine: no IP address is collected, your hostname and machine name are stripped, your OS username is removed from every path (your home directory is replaced with `~`), captured local variables are dropped, and known secrets/API keys/emails are masked. No source code or diagnostic findings are sent.

Opt out at any time:

- `npx react-doctor@latest --no-telemetry` disables Sentry entirely (crash reporting, tracing, and usage counters) for that run, alongside the hosted score API.
- `SENTRY_TRACES_SAMPLE_RATE=0` keeps crash reporting and usage counters but turns off performance tracing.

## Contributing

[Issues welcome!](https://github.com/millionco/react-doctor/issues)

MIT-licensed
