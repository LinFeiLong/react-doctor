# What is React Doctor?

React Doctor is a deterministic scanner for React codebases. It finds issues across state and effects, performance, architecture, security, accessibility, and framework-specific patterns.

It is built for teams using React directly, Next.js, Vite, TanStack, React Native, Expo, and similar React stacks.

## Why use it?

React Doctor gives you a repeatable way to find React problems that coding agents and normal lint rules often miss.

Use it to:

- Audit a project locally.
- Review only files changed in a branch.
- Add PR comments and GitHub annotations.
- Teach coding agents the project’s React quality bar.
- Keep staged-file feedback visible before commits.

## How it fits with linting

React Doctor is not a replacement for your existing lint setup. It can run as a CLI, as a CI check, or through standalone oxlint and ESLint plugins.

The CLI also respects existing ignore files and can adopt JSON ESLint or oxlint rule settings when available.

## Typical workflow

```bash
npx react-doctor@latest
```

Then, for day-to-day work:

```bash
npx react-doctor@latest --verbose --diff
```

Use `--diff` when you want feedback on changes rather than the whole repository.
