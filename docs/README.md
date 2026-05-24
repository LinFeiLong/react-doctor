# React Doctor documentation

React Doctor scans React codebases for correctness, performance, architecture, security, accessibility, and framework-specific issues.

Use these docs to run your first scan, install React Doctor into coding-agent workflows, configure rules, and wire checks into CI.

## Overview

- [What is React Doctor?](./overview/what-is-react-doctor.md)
- [What is a score?](./overview/what-is-a-score.md)

## Getting Started

- [Run your first scan](./getting-started/run-your-first-scan.md)
- [Install for coding agents](./getting-started/install-for-coding-agents.md)
- [How to fix issues](./getting-started/how-to-fix-issues.md)
- [Skills and recurring usage](./getting-started/skills-and-recurring-usage.md)

## CI and PRs

- [PR feedback](./ci-and-prs/pr-feedback.md)
- [Blocking PRs](./ci-and-prs/blocking-prs.md)

## Configuration

- [Config files](./configuration/config-files.md)
- [Rules, ignores, suppressions](./configuration/rules-ignores-suppressions.md)
- [ESLint and oxlint plugins](./configuration/eslint-and-oxlint-plugins.md)
- [Companion plugins](./configuration/companion-plugins.md)

## Reference

- [CLI reference](./reference/cli-reference.md)
- [Node.js API](./reference/node-api.md)

## Community

- [Contributing and license](./community/contributing-and-license.md)

## Local commands

```bash
npx react-doctor@latest
npx react-doctor@latest --verbose --diff
npx react-doctor@latest install
```

For full CLI options, see the package README or run:

```bash
npx react-doctor@latest --help
```
