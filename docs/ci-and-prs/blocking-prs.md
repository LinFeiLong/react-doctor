# Blocking PRs

Use `fail-on` to control whether React Doctor blocks a pull request.

## Modes

| Mode      | Behavior                                   |
| --------- | ------------------------------------------ |
| `error`   | Fail CI when error diagnostics are present |
| `warning` | Fail CI on warnings or errors              |
| `none`    | Never fail from diagnostics                |

## Recommended rollout

Start with visibility:

```yaml
with:
  fail-on: none
```

Then move to an error-only gate:

```yaml
with:
  fail-on: error
```

Use `warning` only once the project has a stable baseline and the team agrees warnings should block merges.

## Diff-only gating

Combine `fail-on` with `diff` to gate on changed files instead of the whole repository:

```yaml
with:
  diff: ${{ github.base_ref }}
  fail-on: error
```

This is the safest default for existing codebases.

## Score floors

The GitHub Action exposes a `score` output. You can use it in a follow-up step, but treat empty scores carefully. Scores can be empty in offline mode or when the score API is unreachable.
