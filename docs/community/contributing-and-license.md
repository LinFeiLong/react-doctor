# Contributing and license

React Doctor is developed in the `millionco/react-doctor` repository.

## Where code lives

The main packages are:

| Package                               | Purpose                               |
| ------------------------------------- | ------------------------------------- |
| `packages/core`                       | Diagnostic engine and shared services |
| `packages/react-doctor`               | Published CLI and public API          |
| `packages/oxlint-plugin-react-doctor` | Canonical rule implementation         |
| `packages/eslint-plugin-react-doctor` | ESLint mirror of the rule set         |
| `packages/website`                    | Documentation and site                |

## Tests

Run focused tests from the package you are editing:

```bash
nr test tests/install-git-hook.test.ts
```

Run broader checks before submitting changes:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm format:check
```

## Contributing rules

Most React Doctor rules live in:

```text
packages/oxlint-plugin-react-doctor/src/plugin/rules
```

Add focused tests for every rule change. Prefer fixture-style regressions that capture the exact false positive or missed diagnostic.

## License

React Doctor is distributed under the repository license. See [`LICENSE`](../../LICENSE).
