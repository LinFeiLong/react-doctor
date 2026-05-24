# Run your first scan

Run React Doctor from the root of a React project:

```bash
npx react-doctor@latest
```

React Doctor detects the framework, React version, language, monorepo projects, and relevant rule families before scanning.

## Get more detail

Use `--verbose` to show more rule and file detail:

```bash
npx react-doctor@latest --verbose
```

## Scan only changed files

Use `--diff` when you are working on a branch:

```bash
npx react-doctor@latest --verbose --diff
```

You can pass a base branch explicitly:

```bash
npx react-doctor@latest --diff main
```

## Scan a monorepo project

If React Doctor detects multiple projects, select one interactively or pass a project name:

```bash
npx react-doctor@latest --project web
```

Use commas for multiple projects:

```bash
npx react-doctor@latest --project web,mobile
```

## Machine-readable output

Use `--json` for automation:

```bash
npx react-doctor@latest --json
```

`--json` suppresses human-readable output. Errors still return JSON so downstream scripts can parse stdout reliably.
