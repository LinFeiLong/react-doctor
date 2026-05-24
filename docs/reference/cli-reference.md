# CLI reference

Run React Doctor from the command line:

```bash
react-doctor [directory] [options]
```

If `directory` is omitted, React Doctor scans the current directory.

## Common commands

```bash
npx react-doctor@latest
npx react-doctor@latest --verbose --diff
npx react-doctor@latest install
npx react-doctor@latest install --agent-hooks
```

## Options

| Option                         | Description                                            |
| ------------------------------ | ------------------------------------------------------ |
| `-v, --version`                | Print the installed version                            |
| `--no-lint`                    | Skip lint diagnostics                                  |
| `--verbose`                    | Show every rule and per-file details                   |
| `--score`                      | Output only the numeric score                          |
| `--json`                       | Output a structured JSON report                        |
| `--json-compact`               | Emit compact JSON with `--json`                        |
| `-y, --yes`                    | Skip prompts                                           |
| `--full`                       | Force a full scan                                      |
| `--project <name>`             | Select workspace project, comma-separated for multiple |
| `--diff [base]`                | Scan files changed against a base branch               |
| `--offline`                    | Skip score API and share URL                           |
| `--staged`                     | Scan staged files for pre-commit hooks                 |
| `--fail-on <level>`            | Exit non-zero on `error`, `warning`, or `none`         |
| `--annotations`                | Emit GitHub Actions annotations                        |
| `--pr-comment`                 | Tune output for sticky PR comments                     |
| `--explain <file:line>`        | Explain a diagnostic or suppression                    |
| `--why <file:line>`            | Alias for `--explain`                                  |
| `--respect-inline-disables`    | Respect inline disables                                |
| `--no-respect-inline-disables` | Audit mode for inline disables                         |

## Install command

```bash
react-doctor install [options]
```

| Option          | Description                                      |
| --------------- | ------------------------------------------------ |
| `-y, --yes`     | Skip prompts and install for all detected agents |
| `--dry-run`     | Show what would be installed                     |
| `--agent-hooks` | Install native Claude Code and Cursor hooks      |
| `--cwd <cwd>`   | Project root for install                         |

## JSON output

Use `--json` when another tool needs to parse the scan:

```bash
npx react-doctor@latest --json
```

Human-readable output is suppressed. Errors still produce JSON with `ok: false`, so stdout remains parseable.

## Explaining suppressions

Use `--explain` when a diagnostic or suppression is confusing:

```bash
npx react-doctor@latest --explain src/App.tsx:42
```

The output reports what React Doctor sees at that location and why a nearby suppression did or did not apply.
