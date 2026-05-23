<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/react-doctor-readme-logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/react-doctor-readme-logo-light.svg">
  <img alt="React Doctor" src="./assets/react-doctor-readme-logo-light.svg" width="180" height="40">
</picture>

[![version](https://img.shields.io/npm/v/react-doctor?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-doctor)
[![downloads](https://img.shields.io/npm/dt/react-doctor.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-doctor)

Your agent writes bad React, this catches it.

One command scans your codebase and outputs a **0 to 100 health score** with actionable diagnostics.

Works with Next.js, Vite, and React Native.

### [See it in action →](https://react.doctor)

## Install

Run this at your project root:

```bash
npx react-doctor@latest
```

You'll get a score (75+ Great, 50 to 74 Needs work, under 50 Critical) and a list of issues across state & effects, performance, architecture, security, and accessibility. Rules toggle automatically based on your framework and React version.

https://github.com/user-attachments/assets/07cc88d9-9589-44c3-aa73-5d603cb1c570

## Install for your coding agent

Teach your coding agent React best practices so it stops writing the bad code in the first place.

```bash
npx react-doctor@latest install
```

You'll be prompted to pick which detected agents to install for. Pass `--yes` to skip prompts.

Works with Claude Code, Cursor, Codex, OpenCode, and 50+ other agents.

## GitHub Actions

A composite action ships with this repository. Drop it into `.github/workflows/react-doctor.yml`:

```yaml
name: React Doctor

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  pull-requests: write # required to post PR comments

jobs:
  react-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0 # required for `diff`
      - uses: millionco/react-doctor@main
        with:
          diff: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

When `github-token` is set on `pull_request` events, findings are posted (and updated) as a sticky PR comment. The action also exposes a `score` output (0–100) you can read in subsequent steps — see [PR blocking and exit codes](#pr-blocking-and-exit-codes) for a score-floor recipe.

**Inputs:** `directory`, `verbose`, `project`, `diff`, `github-token`, `fail-on` (`error` / `warning` / `none`), `offline`, `annotations`, `node-version`. See [`action.yml`](https://github.com/millionco/react-doctor/blob/main/action.yml) for full descriptions.

#### PR feedback modes

Pick one or both; they're independent.

- **Comments only** (default): set `github-token`.
- **Annotations only**: set `annotations: true`.
- **Both**: set `github-token` and `annotations: true`. Annotation lines are stripped from the comment body.

```yaml
- uses: millionco/react-doctor@main
  with:
    diff: main
    github-token: ${{ secrets.GITHUB_TOKEN }}
    annotations: true
```

Prefer not to add a marketplace action? The bare `npx` form works too:

```yaml
- run: npx react-doctor@latest --fail-on warning
```

## PR blocking and exit codes

Two independent gates — pick one or both:

- **`--fail-on <level>`** exits non-zero on diagnostics: `error` (default), `warning`, or `none`. Combine with `--diff <base>` to gate on PR-introduced regressions only.
- **Score floor** — read the action's `score` output in a follow-up step and `exit 1` below your threshold. `score` can be empty (offline mode, API unreachable) — treat empty as a no-op or you'll block unrelated PRs. Pin a specific `react-doctor` version when gating on score; new rule releases can lower it.

`--annotations` and `github-token` are visualization layers and never change the exit code.

## Configuration

Create a `react-doctor.config.json` in your project root:

```json
{
  "ignore": {
    "rules": ["react-doctor/no-danger", "react-doctor/no-autofocus"],
    "files": ["src/generated/**"],
    "overrides": [
      {
        "files": ["components/modules/diff/**"],
        "rules": ["react-doctor/no-array-index-as-key", "react-doctor/no-render-in-render"]
      },
      {
        "files": ["components/search/HighlightedSnippet.tsx"],
        "rules": ["react-doctor/no-danger"]
      }
    ]
  }
}
```

Three nested keys, three layers of granularity — pick the narrowest one that fits:

- **`ignore.rules`** silences a rule across the whole codebase.
- **`ignore.files`** silences **every** rule on the matched files (use sparingly — it loses coverage for unrelated rules).
- **`ignore.overrides`** silences only the listed rules on the matched files, leaving every other rule active. This is what you want when a single file (or glob) legitimately needs an exemption from one or two rules but should still be scanned for everything else.

You can also use the `"reactDoctor"` key in `package.json`. CLI flags always override config values.

React Doctor respects `.gitignore`, `.eslintignore`, `.oxlintignore`, `.prettierignore`, and `linguist-vendored` / `linguist-generated` annotations in `.gitattributes`. Inline `// eslint-disable*` and `// oxlint-disable*` comments are honored too.

If you have a JSON oxlint or eslint config (`.oxlintrc.json` or `.eslintrc.json`), its rules get merged into the scan automatically and count toward the score. Set `adoptExistingLintConfig: false` to opt out.

#### Surface controls

Diagnostics flow through four surfaces — `cli`, `prComment`, `score`, `ciFailure` — each independently tunable. By default the `design` tag (Tailwind shorthand, pure-black backgrounds, gradient text) stays on the CLI but is excluded from PR comments, score, and `--fail-on` so style cleanup doesn't dilute React findings.

```json
{
  "surfaces": {
    "prComment": { "includeTags": ["design"] },
    "ciFailure": { "excludeTags": ["test-noise"] }
  }
}
```

Each surface accepts `include`/`exclude` × `Tags`/`Categories`/`Rules`. Include wins over exclude.

#### Rule severity (`rules`, `categories`)

Same shape as ESLint / oxlint. `rules` is ESLint's exact field; `categories` mirrors oxlint's, keyed by React Doctor display categories (`"React Native"`, `"Server"`, `"Architecture"`, …).

```json
{
  "rules": { "react-doctor/no-array-index-as-key": "error" },
  "categories": { "React Native": "warn" }
}
```

Per-rule wins over per-category. `"off"` short-circuits before the rule runs; `"warn"` / `"error"` re-stamps the diagnostic so every channel — CLI, PR comment, score, `--fail-on` — sees the chosen severity, including for external-plugin rules. Use `surfaces` instead when you only want to hide a rule from one channel; use `ignore.tags` to silence a whole tag-defined family (`"design"`, `"test-noise"`, `"migration-hint"`) that doesn't align with a single category.

#### Optional companion plugins

If [`eslint-plugin-react-hooks`](https://www.npmjs.com/package/eslint-plugin-react-hooks) (v6 or v7) is installed in the scanned project, the React Compiler frontend's correctness rules fold into the same scan under the `react-hooks-js/*` namespace.

### Inline suppressions

```tsx
// react-doctor-disable-next-line react-doctor/no-cascading-set-state
useEffect(() => {
  setA(value);
  setB(value);
}, [value]);
```

For multiple rules on one line, comma-separate them or stack one comment per rule directly above. Stacked comments only chain when nothing but other `react-doctor-disable-next-line` comments sits between them and the target. Block comments (`{/* react-doctor-disable-next-line ... */}`) work inside JSX.

If a suppression looks adjacent but doesn't take, `react-doctor --explain <file:line>` reports why.

## Custom rules (user plugins)

Drop an oxlint-shaped plugin into `react-doctor.config.json` to run team-specific rules alongside the built-ins:

```json
{
  "plugins": ["./lint/team-conventions.cjs", "react-doctor-plugin-shopify-conventions"],
  "rules": {
    "team-conventions/no-bare-fetch": "error",
    "shopify-conventions/use-polaris-tokens": "warn"
  }
}
```

`plugins` accepts a path relative to the config file or an npm package name. The plugin module exports `{ meta: { name }, rules: { [name]: { create(context) { ... } } } }` — the standard oxlint plugin contract. Rule keys are `<plugin.meta.name>/<rule>`; `meta.name` is required.

Plugin rules are **opt-in** (only fire when explicitly enabled in `rules`) and flow through every surface (CLI / PR comment / score / `--fail-on`) the same as built-ins. An unresolvable plugin logs a warning and is skipped — the scan keeps going. For TypeScript types and a `defineRule` helper, install [`oxlint-plugin-react-doctor`](https://npmjs.com/package/oxlint-plugin-react-doctor) and import from there.

## Lint plugin (standalone)

The same rule set ships as both an oxlint plugin and an ESLint plugin, so you can wire it into whichever lint engine your project already runs. These are published as separate packages, so you can install just the lint integration without pulling in the full CLI.

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

The full rule list lives in [`packages/oxlint-plugin-react-doctor/src/plugin/rules`](https://github.com/millionco/react-doctor/tree/main/packages/oxlint-plugin-react-doctor/src/plugin/rules).

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

### React Native rules in mixed monorepos

`rn-*` rules respect per-package boundaries automatically. Every `rn-*` rule walks to the file's nearest `package.json`:

- Declares `react-native`, `react-native-tvos`, `expo`, `expo-router`, `@expo/*`, `react-native-windows` / `-macos`, any `@react-native/` or `@react-native-*` package, or Metro's top-level `"react-native"` field → rules ON.
- Declares a web-only framework (`next`, `vite`, `react-scripts`, `gatsby`, `@remix-run/*`, `@docusaurus/*`, `@storybook/*`, or plain `react-dom`) → rules OFF.
- No local signal → falls back to project-level detection.

File extensions override the package classification: `*.web.tsx` / `.web.jsx` are always skipped; `*.ios.tsx` / `.android.tsx` / `.native.tsx` are always scanned.

`rn-no-raw-text` additionally short-circuits inside `Platform.OS === "web"` branches (`if` / ternary / `&&` / `switch` / `Platform.select({ web })`). Only the explicit web branch is exempt — negative checks like `Platform.OS === "ios"` are not treated as web guards.

## Scoring

The health score formula: `100 - (unique_error_rules x 1.5) - (unique_warning_rules x 0.75)`.

Scoring runs on react.doctor's API and is **network-dependent**: without a successful API round-trip (or under `--offline`) the score is omitted and the rest of the report still renders normally. Score-based automation must treat an empty value as a no-op (see the strict-threshold example above). Key details:

- The score counts **unique rules triggered**, not total instances. Fixing 49 of 50 `no-barrel-import` violations does not change the score; fixing all 50 removes the 0.75 penalty for that rule.
- Error-severity rules cost 1.5 points each. Warning-severity rules cost 0.75 points each.
- Category breakdowns shown in the output are for display only and do not weight the score.

Score labels: 75+ is **Great**, 50 to 74 is **Needs work**, under 50 is **Critical**.

Scores may decrease across releases as new rules are added. Each new rule that fires in your codebase introduces an additional penalty. This is expected — it means the tool is catching more issues, not that your code got worse. Pin to a specific react-doctor version in CI if you need stable scores across upgrades.

## Diff and staged modes

React Doctor can scan only changed files instead of the full project:

- **`--diff [base]`** scans files changed vs a base branch. Auto-detects `main`/`master`, or pass an explicit branch: `--diff develop`. Also available as a config key: `"diff": true` or `"diff": "develop"`.
- **`--staged`** scans only files in the git staging area (index). Designed for pre-commit hooks — materializes staged file contents into a temp directory so the scan reflects exactly what will be committed.
- **`--full`** forces a full scan, overriding any `diff` value in config or CLI.

When on a feature branch without explicit flags, you'll be prompted: "Only scan changed files?" This prompt is suppressed in CI, `--json` mode, and non-interactive environments.

`--staged` and `--diff` cannot be combined.

### Pre-commit hooks

`--staged` reads from the git **index** (not the working tree), so partially-staged files scan exactly as they'll be committed. The most common shape with [lint-staged](https://github.com/lint-staged/lint-staged):

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": "react-doctor --staged --fail-on warning"
  }
}
```

Do **not** append `{staged-files}` — react-doctor already discovers the index itself, and passing the list as positional args turns the scan into a union (path filter + index scan). The same command works under [Husky](https://typicode.github.io/husky/), [Lefthook](https://lefthook.dev/), [pre-commit](https://pre-commit.com/), or a hand-written `.git/hooks/pre-commit`.

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

## OpenTelemetry tracing (opt-in)

Every internal service method (`Project.discover`, `Linter.run`, `Config.resolve`, `Score.compute`, etc.) is instrumented as a named span; the top-level `runInspect` orchestrator is the parent span. By default the spans run in-process and don't ship anywhere.

To export spans to an OTLP-compatible backend (Axiom, Honeycomb, Datadog, Tempo, etc.), set both env vars before running:

```bash
REACT_DOCTOR_OTLP_ENDPOINT="https://api.axiom.co" \
REACT_DOCTOR_OTLP_AUTH_HEADER="Bearer $AXIOM_TOKEN" \
react-doctor
```

If either var is missing, no exporter is attached and there's no network traffic. Both the CLI (`inspect()`) and the programmatic `diagnose()` API honor these.

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
