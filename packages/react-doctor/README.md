<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/react-doctor-readme-logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/react-doctor-readme-logo-light.svg">
  <img alt="React Doctor" src="./assets/react-doctor-readme-logo-light.svg" width="180" height="40">
</picture>

[![version](https://img.shields.io/npm/v/react-doctor?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-doctor)
[![downloads](https://img.shields.io/npm/dt/react-doctor.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-doctor)

Your agent writes bad React, this catches it.

React Doctor deterministically scans your codebase and finds issues across state & effects, performance, architecture, security, and accessibility.

Works for all React frameworks and libraries - Next.js, Vite, TanStack, React Native, Expo, you name it.

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

If this is a Git repo, `install` also asks whether to add a non-blocking pre-commit hook that runs `react-doctor --staged --fail-on none`, so staged-file findings are logged without blocking commits. Existing hook setups are reused when detected, including `core.hooksPath`, Husky, Vite Plus, simple-git-hooks, Lefthook, pre-commit, Overcommit, Yorkie, ghooks, git-hooks-js, lint-staged, nano-staged, and pretty-quick; otherwise React Doctor writes directly to `.git/hooks/pre-commit`.

For agents with native lifecycle hooks, opt in to automatic post-edit checks:

```bash
npx react-doctor@latest install --agent-hooks
```

This currently installs project hooks for Claude Code and Cursor. They run `react-doctor --verbose --diff --fail-on warning --offline` after agent file edits and feed findings back to the agent without blocking tool calls. Agents without a stable hook API still use the installed skill plus the Git hook.

In the interactive installer, native agent hooks are offered as an optional step and default to **No**. Pass `--agent-hooks` to opt in from CI or scripts.

### 3. Run in CI (GitHub Actions) for your team

Add a workflow to scan every pull request and leave findings where reviewers already look:

```yaml
name: React Doctor

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  react-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: millionco/react-doctor@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          diff: ${{ github.base_ref }}
          fail-on: error
          annotations: true
```

`diff` keeps CI focused on files changed in the PR, `annotations` shows findings inline in GitHub's Files changed view, and `github-token` enables a sticky React Doctor PR comment with the score and scan output. Use `fail-on: warning` for a stricter gate, or `fail-on: none` while introducing React Doctor to an existing codebase.

## Configuration

Create a `react-doctor.config.json` in your project root (or use a `"reactDoctor"` key in `package.json`). CLI flags always win.

```json
{
  "ignore": {
    "rules": ["react-doctor/no-danger"],
    "files": ["src/generated/**"],
    "overrides": [
      {
        "files": ["components/search/HighlightedSnippet.tsx"],
        "rules": ["react-doctor/no-danger"]
      }
    ]
  },
  "rules": { "react-doctor/no-array-index-as-key": "error" },
  "categories": { "React Native": "warn" }
}
```

- **`ignore.rules`** — silence a rule across the codebase.
- **`ignore.files`** — silence **every** rule on matched files (use sparingly).
- **`ignore.overrides`** — silence specific rules on specific files; leave others active.
- **`rules` / `categories`** — same shape as ESLint / oxlint. Per-rule wins over per-category.

React Doctor respects `.gitignore`, `.eslintignore`, `.oxlintignore`, `.prettierignore`, and `linguist-vendored` / `linguist-generated` annotations in `.gitattributes`. Inline `// eslint-disable*` and `// oxlint-disable*` comments are honored. Existing `.oxlintrc.json` / `.eslintrc.json` rules merge in automatically — set `adoptExistingLintConfig: false` to opt out. If [`eslint-plugin-react-hooks`](https://www.npmjs.com/package/eslint-plugin-react-hooks) (v6/v7) is installed, its correctness rules fold into the scan under `react-hooks-js/*`.

#### Surface controls

Diagnostics flow through four surfaces — `cli`, `prComment`, `score`, `ciFailure` — each independently tunable. By default the `design` tag stays on the CLI but is excluded from PR comments, score, and `--fail-on`.

```json
{
  "surfaces": {
    "prComment": { "includeTags": ["design"] },
    "ciFailure": { "excludeTags": ["test-noise"] }
  }
}
```

Each surface accepts `include` / `exclude` × `Tags` / `Categories` / `Rules`. Include wins over exclude.

### Inline suppressions

```tsx
// react-doctor-disable-next-line react-doctor/no-cascading-set-state
useEffect(() => {
  setA(value);
  setB(value);
}, [value]);
```

Comma-separate multiple rules, or stack one comment per rule. Block comments (`{/* ... */}`) work inside JSX. If a suppression doesn't take, run `react-doctor --explain <file:line>`.

## Custom rules (user plugins)

Drop an oxlint-shaped plugin into your config to run team-specific rules:

```json
{
  "plugins": ["./lint/team-conventions.cjs", "react-doctor-plugin-shopify-conventions"],
  "rules": {
    "team-conventions/no-bare-fetch": "error",
    "shopify-conventions/use-polaris-tokens": "warn"
  }
}
```

`plugins` accepts a relative path or npm package name. Modules export `{ meta: { name }, rules: { [name]: { create(context) { ... } } } }`. Rule keys are `<plugin.meta.name>/<rule>`. Plugin rules are **opt-in** and flow through every surface. For TypeScript types and a `defineRule` helper, install [`oxlint-plugin-react-doctor`](https://npmjs.com/package/oxlint-plugin-react-doctor).

## Lint plugin (standalone)

The same rule set ships as standalone oxlint and ESLint plugins — wire it into your existing lint engine without the CLI.

**oxlint** in `.oxlintrc.json` (install [`oxlint-plugin-react-doctor`](https://npmjs.com/package/oxlint-plugin-react-doctor)):

```jsonc
{
  "jsPlugins": [{ "name": "react-doctor", "specifier": "oxlint-plugin-react-doctor" }],
  "rules": {
    "react-doctor/no-fetch-in-effect": "warn",
    "react-doctor/no-derived-state-effect": "warn",
  },
}
```

**ESLint** flat config (install [`eslint-plugin-react-doctor`](https://npmjs.com/package/eslint-plugin-react-doctor)):

```js
import reactDoctor from "eslint-plugin-react-doctor";

export default [
  reactDoctor.configs.recommended,
  reactDoctor.configs.next,
  reactDoctor.configs["react-native"],
  reactDoctor.configs["tanstack-start"],
  reactDoctor.configs["tanstack-query"],
];
```

Full rule list: [`packages/oxlint-plugin-react-doctor/src/plugin/rules`](https://github.com/millionco/react-doctor/tree/main/packages/oxlint-plugin-react-doctor/src/plugin/rules).

## CLI reference

```
Usage: react-doctor [directory] [options]

Options:
  -v, --version           display the version number
  --no-lint               skip linting
  --verbose               show every rule and per-file details (default shows top 3 rules)
  --score                 output only the score
  --json                  output a single structured JSON report
  -y, --yes               skip prompts, scan all workspace projects
  --full                  skip prompts, always run a full scan
  --project <name>        select workspace project (comma-separated for multiple)
  --diff [base]           scan only files changed vs base branch
  --staged                scan only staged files (for pre-commit hooks)
  --offline               skip the score API and share URL (no score shown)
  --fail-on <level>       exit with error on diagnostics: error, warning, none
  --annotations           output diagnostics as GitHub Actions annotations
  --pr-comment            tune CLI output for sticky PR comments (drops design
                          cleanup from the printed list and fail-on gate)
  --explain <file:line>   diagnose why a rule fired or why a suppression didn't apply
  --why <file:line>       alias for --explain
  -h, --help              display help

Commands:
  install --agent-hooks   install native non-blocking agent hooks for Claude Code
                          and Cursor
```

When a suppression isn't working, `--explain <file:line>` (or its alias `--why <file:line>`) reports what the scanner sees at that location, including why a nearby `react-doctor-disable-next-line` didn't apply. The diagnosis distinguishes the common failure modes — adjacent comment for a different rule (use the comma form), a code line between the comment and the diagnostic (the chain is broken), or no nearby suppression at all. The same hint surfaces inline with `--verbose` for every flagged site, and in `--json` output as `diagnostic.suppressionHint`, so a single scan doubles as a suppression audit without a separate flag.

`--json` produces a parsable object on stdout with all human-readable output suppressed. Errors still produce a JSON object with `ok: false`, so stdout is always a valid document.

### Config keys

| Key                        | Type                             | Default  |
| -------------------------- | -------------------------------- | -------- |
| `ignore.rules`             | `string[]`                       | `[]`     |
| `ignore.files`             | `string[]`                       | `[]`     |
| `ignore.overrides`         | `{ files, rules? }[]`            | `[]`     |
| `lint`                     | `boolean`                        | `true`   |
| `verbose`                  | `boolean`                        | `false`  |
| `diff`                     | `boolean \| string`              |          |
| `failOn`                   | `"error" \| "warning" \| "none"` | `"none"` |
| `customRulesOnly`          | `boolean`                        | `false`  |
| `share`                    | `boolean`                        | `true`   |
| `offline`                  | `boolean`                        | `false`  |
| `textComponents`           | `string[]`                       | `[]`     |
| `rawTextWrapperComponents` | `string[]`                       | `[]`     |
| `serverAuthFunctionNames`  | `string[]`                       | `[]`     |
| `respectInlineDisables`    | `boolean`                        | `true`   |
| `adoptExistingLintConfig`  | `boolean`                        | `true`   |
| `ignore.tags`              | `string[]`                       | `[]`     |

- `textComponents` — components that behave like RN's `<Text>` (custom `Typography`, `NativeTabs.Trigger.Label`). Broad escape hatch for `rn-no-raw-text`.
- `rawTextWrapperComponents` — wrappers that route stringifiable children through an internal `<Text>` (e.g. `heroui-native`'s `Button`). Narrower: only suppresses when children are entirely strings.
- `serverAuthFunctionNames` — custom auth guards (`requireWorkspaceMember`, `ensureSignedIn`) `server-auth-actions` should accept as a top-of-action auth check.
- `ignore.tags` — suppresses rule families by tag. Available: `"design"` (gradient text, pure black backgrounds, default Tailwind palettes).
- `offline` — skip the score API entirely. CI is not offline by default; only the share URL is suppressed there.

## Node.js API

```js
import { diagnose, toJsonReport, summarizeDiagnostics } from "react-doctor/api";

const result = await diagnose("./path/to/your/react-project");

console.log(result.score); // { score: 82, label: "Great" } or null
console.log(result.diagnostics); // Diagnostic[]
console.log(result.project); // detected framework, React version, etc.
```

`diagnose` accepts a second argument: `{ lint?: boolean }`.

```js
const report = toJsonReport(result, { version: "1.0.0" });
const counts = summarizeDiagnostics(result.diagnostics);
```

`react-doctor/api` re-exports `JsonReport`, `JsonReportSummary`, `JsonReportProjectEntry`, `JsonReportMode`, plus the lower-level `buildJsonReport` and `buildJsonReportError` builders. See [`packages/react-doctor/src/api.ts`](https://github.com/millionco/react-doctor/blob/main/packages/react-doctor/src/api.ts) for the full types.

## Leaderboard

Top React codebases scanned by React Doctor, ranked by score. Updated automatically from [millionco/react-doctor-benchmarks](https://github.com/millionco/react-doctor-benchmarks).

<!-- LEADERBOARD:START -->
<!-- prettier-ignore -->
| #  | Repo | Score |
| -- | ---- | ----: |
| 1  | [executor](https://github.com/RhysSullivan/executor) | 96 |
| 2  | [nodejs.org](https://github.com/nodejs/nodejs.org) | 86 |
| 3  | [tldraw](https://github.com/tldraw/tldraw) | 71 |
| 4  | [t3code](https://github.com/pingdotgg/t3code) | 69 |
| 5  | [better-auth](https://github.com/better-auth/better-auth) | 64 |
| 6  | [mastra](https://github.com/mastra-ai/mastra) | 63 |
| 7  | [excalidraw](https://github.com/excalidraw/excalidraw) | 62 |
| 8  | [payload](https://github.com/payloadcms/payload) | 60 |
| 9  | [typebot](https://github.com/baptisteArno/typebot.io) | 57 |
| 10 | [medusajs/admin](https://github.com/medusajs/medusa) | 56 |

<!-- LEADERBOARD:END -->

See the [full leaderboard](https://www.react.doctor/leaderboard).

## Contributing

PRs and issues welcome — [issue tracker](https://github.com/millionco/react-doctor/issues). Local dev: `pnpm install && pnpm build`.

MIT-licensed.
