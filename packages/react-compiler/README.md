# babel-plugin-react-compiler (vendored)

A flattened, vendored copy of [`babel-plugin-react-compiler`](https://github.com/facebook/react/tree/main/compiler/packages/babel-plugin-react-compiler)
(the React Compiler) wired into this repo's pnpm + turbo workspace.

The source under `src/` is copied verbatim from `facebook/react` (`compiler/packages/babel-plugin-react-compiler/src`,
`__tests__` excluded) and retains its original MIT license headers. It is built
with the repo's standard `vp pack` (vite-plus / tsdown) pipeline instead of the
upstream `tsup` config, producing a CommonJS bundle at `dist/index.js`.

## Scripts

- `pnpm --filter babel-plugin-react-compiler build` — bundle `src/index.ts` to `dist/`
- `pnpm --filter babel-plugin-react-compiler typecheck` — `tsc --noEmit`
- `pnpm --filter babel-plugin-react-compiler test` — run the ported test suite

## Tests

The full upstream test suite is ported under `src/__tests__/` (excluded from
the build and from `tsc`):

- **Unit tests** (`*.test.ts`) — the original jest unit tests (`DisjointSet`,
  `Logger`, `Result`, `envConfig`, `parseConfigPragma`) adapted to
  `vite-plus/test` (run in the `unit` project).
- **Snapshot fixtures** (`fixtures/compiler/**`, ~1,700 cases) — driven by
  `fixtures.test.ts` + `runner/harness.ts`, a native re-implementation of
  upstream's `snap` runner. Each fixture is compiled with the **built** compiler
  (`dist/index.js`, so `__DEV__` matches production) and compared byte-for-byte
  against its stored `.expect.md`. Runtime evaluation is **not** re-run: the
  `### Eval output` section is reused verbatim from the stored snapshot, exactly
  as upstream `snap` does when invoked without the evaluator.

  Output formatting is version-sensitive, so a few deps are pinned to the
  versions the snapshots were generated with: `prettier@3.3.3`,
  `hermes-parser@0.25.1`, `babel-plugin-fbt@1.0.0`, `babel-plugin-fbt-runtime@1.0.0`,
  `babel-plugin-idx@3.0.3`.

- **e2e tests** (`e2e/*.e2e.js`) — `@testing-library/react` rendering tests run
  in `jsdom` against React 19. Mirroring upstream's two jest projects, they run
  twice via vitest [projects](https://vitest.dev/guide/projects): once **with**
  the compiler (`e2e-forget`) and once **without** (`e2e-no-forget`), toggled by
  the `__FORGET__` global. `runner/e2e-plugin.ts` is a vite transform that runs
  the React Compiler on `.e2e.js` files (forget mode) before `@babel/preset-react`
  lowers JSX — the same ordering as upstream's `scripts/jest/makeTransform.ts`.

The three vitest projects (`unit`, `e2e-forget`, `e2e-no-forget`) mirror the
upstream jest projects (`main`, `e2e with forget`, `e2e no forget`).

## Updating from upstream

Re-copy `compiler/packages/babel-plugin-react-compiler/src` from `facebook/react`
(excluding `__tests__`) over `src/`. The build/config files here are repo-owned
and should not be overwritten. To refresh the test corpus, re-copy
`src/__tests__/fixtures` and the `*-test.ts` unit tests (re-applying the
`vite-plus/test` import + `*.test.ts` rename) and `src/__tests__/e2e`.
`runner/harness.ts` and `runner/e2e-plugin.ts` are repo-owned.
