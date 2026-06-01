# RN/Expo Tier-1 Rule Contracts (stage 1)

Stage-1 `rule-research` output for the Tier-1 candidate set from
[`react-native-expo-rule-candidates.md`](./react-native-expo-rule-candidates.md), after the
edge-case audit. Each contract is grounded in a codebase inspection of existing detectors and
utilities (not just the research doc).

Pipeline: **rule-research (this doc)** → rule-writing (tests + impl) → rule-validate (noise,
correctness, PR copy).

## Shared infrastructure to reuse (found during inspection)

- **AST source / specifier match:** `bundle-size/no-moment` (`node.source?.value`),
  `react-native/rn-no-deprecated-modules` (`ImportDeclaration` + named specifiers),
  `react-native/rn-prefer-expo-image` (flag the import specifier).
- **Import resolution (local name → module + canonical name):**
  `utils/find-import-source-for-name.ts` → `getImportedNameFromModule` / `isImportedFromModule`.
- **JSX element name → import:** `react-native/utils/resolve-jsx-element-name.ts` +
  `getImportedNameFromModule` (see `rn-list-missing-estimated-item-size`).
- **Client/server/tooling file classification:** `utils/classify-secret-file-exposure.ts`
  (returns `client | server | test | tooling | unknown`); Expo gate via
  `utils/is-expo-managed-file.ts`.
- **Project-level checks** (read files, return `Diagnostic[]`): `check-pnpm-hardening.ts`
  (package.json + diagnostic builder), `project-info/detect-react-compiler.ts`
  (babel config + `app.json`/`app.config.*` reading patterns, `getLowestDependencyMajor`).
  These run in `run-inspect`'s environment-checks phase.
- **Test/e2e filename gate:** `utils/is-testlike-filename.ts` (needs an e2e-specific extension
  for Detox).

Diagnostic shape (project-level): `{ filePath, plugin: "react-doctor", rule, severity, message,
help, line, column, category }`.

## Tier-1 contracts at a glance

| #   | Rule                                       | Surface                                   | Detector precision  |
| --- | ------------------------------------------ | ----------------------------------------- | ------------------- |
| 1   | `rn-no-deep-imports`                       | AST (import/re-export source)             | syntax-only         |
| 2   | `rn-no-set-native-props`                   | AST (member call shape)                   | syntax-only         |
| 3   | `rn-no-metro-babel-preset`                 | project-level (babel config)              | config text/regex   |
| 4   | `expo-reanimated-v4-requires-new-arch`     | project-level (package.json + app config) | manifest + config   |
| 5   | `rn-no-panresponder`                       | AST (import specifier)                    | scope-aware         |
| 6   | `rn-no-image-children`                     | AST (JSX)                                 | scope-aware + JSX   |
| 7   | `expo-no-non-inlined-env`                  | AST (`process.env`) + file-scope          | syntax + file-scope |
| 8   | `expo-updates-no-unsafe-production-config` | project-level (app config)                | config parse/regex  |
| 9   | `rn-detox-missing-await`                   | AST (e2e test files)                      | path/shape-aware    |
| 10  | `rn-library-react-in-dependencies`         | project-level (package.json)              | manifest            |

---

## 1. `rn-no-deep-imports`

> **⚠ Updated by RDE idea-validation** — the v1 scope below was **narrowed** after the corpus showed
> the broad form is too noisy (Codegen specs, type-only imports, library internals). See
> [Revised contract: `rn-no-deep-imports`](#revised-contract-rn-no-deep-imports-post-rde-narrowing).

**Surface:** AST rule, `rules/react-native/` bucket, `requires: ["react-native"]`, `severity: warn`,
**no** `test-noise` tag (deep imports break in test files on upgrade too). **Detector precision:**
syntax-only.

- **Rule definition:** catches imports / re-exports from the internal subpath
  `react-native/Libraries/...` that should come from the package root `'react-native'`.
- **Runtime reason:** RFC 0894 deprecates subpath imports into RN internals; RN 0.80 emits
  ESLint + console warnings and a `"exports"` map will hard-remove them (~0.82), turning the
  import into a "module not found" throw. The public symbols are all re-exported from `'react-native'`.
- **Detector:** `ImportDeclaration` / `ExportNamedDeclaration` / `ExportAllDeclaration` whose
  `source.value` starts with `react-native/Libraries/`, excluding the allowlist. Flags value and
  type imports.
- **Allowlist (v1, per decision):** `react-native/Libraries/Core/InitializeCore` (still a
  documented side-effect setup import). Keep the list tiny; expand only with RDE evidence.
- **Strong positives:** `import { Alert } from "react-native/Libraries/Alert/Alert"`;
  `export { Text } from "react-native/Libraries/Text/Text"`;
  `export * from "react-native/Libraries/Components/View/View"`;
  `import { Colors } from "react-native/Libraries/NewAppScreen"` (tailor message: moved to
  `@react-native/new-app-screen` in 0.80); `import type { ViewProps } from "react-native/Libraries/..."`.
- **False-positive traps:** root `import … from "react-native"`; tooling subpaths not under
  `Libraries/` (`react-native/jest-preset`, `/cli`, `/scripts`) — excluded by the prefix;
  `jest.mock("react-native/Libraries/…")` — a `CallExpression` we never visit (import/re-export
  only); relative/aliased specifiers that merely contain the substring (`./react-native/Libraries/x`).
- **In scope v1:** static import + re-export forms; value and type imports; the InitializeCore allowlist.
- **Out of scope v1:** dynamic `import()`/`require()` of internals (rare; require-matching risks
  jest.mock confusion); other internal roots (`react-native/src`, `/private`, `/types`); autofix.
- **Test seeds:** invalid = the positives + aliased namespace import; valid = the traps + a
  `react-native-svg` import + the allowlisted `InitializeCore` import.
- **Open questions:** none blocking (decisions: allowlist InitializeCore, `warn`, no `test-noise`).
  Consider escalating to `error` once on RN ≥ 0.82.

## 2. `rn-no-set-native-props`

**Surface:** AST rule, `rules/react-native/`, `requires: ["react-native"]`, `severity: warn`.
**Detector precision:** syntax-only (member-call shape).

- **Rule definition:** catches imperative `ref.current.setNativeProps({...})` calls that are a
  silent no-op under the New Architecture.
- **Runtime reason:** under Fabric (default since RN 0.76) React's `setNativeProps` warns and
  returns without updating the view — the code "runs" but nothing changes.
- **Detector:** `CallExpression` whose `callee` is a non-computed `MemberExpression` with property
  `setNativeProps`, **and** whose `callee.object` is a `MemberExpression` with property `current`
  (the `*.current.setNativeProps(...)` ref shape).
- **Strong positives:** `inputRef.current.setNativeProps({ text })`;
  `this.viewRef.current.setNativeProps({ style })`.
- **False-positive traps:** third-party components that implement their own working
  `setNativeProps` (can't distinguish without types — accept as rare); a bare property access
  `obj.setNativeProps` that isn't called (require `CallExpression`).
- **In scope v1:** the `*.current.setNativeProps(...)` shape.
- **Out of scope v1:** class-ref `this._view.setNativeProps()` and callback-ref
  `ref.setNativeProps()` (no `.current`) → false-negatives, accepted to keep noise near-zero.
- **Test seeds:** invalid = the positives; valid = `Animated.View` usage, `ref.current.focus()`,
  a non-ref `config.setNativeProps()` callback, an uncalled `ref.current.setNativeProps` reference.
- **Open questions:** broaden to class/callback refs later? (defer; needs noise data).

## 3. `rn-no-metro-babel-preset`

**Surface:** project-level check (sibling of `detect-react-compiler` / `check-pnpm-hardening`),
reads babel config. `severity: error` (build hard-fails). **Detector precision:** config text/regex.

- **Rule definition:** catches a babel config preset referencing `metro-react-native-babel-preset`,
  which RN ≥ 0.73 no longer installs.
- **Runtime reason:** the package was renamed to `@react-native/babel-preset` and is uninstalled by
  RN ≥ 0.73, so the preset string fails to resolve and the Metro/Babel transform hard-fails.
- **Detector:** read `BABEL_CONFIG_FILENAMES` at the project root; flag when content matches
  `/metro-react-native-babel-preset/`. Gate on `react-native` present.
- **Strong positives:** `presets: ['module:metro-react-native-babel-preset']`.
- **False-positive traps:** the string inside a comment (rare; acceptable); the successor
  `@react-native/babel-preset` does **not** contain the old substring → no overlap; Expo projects
  use `babel-preset-expo` (different string) → unaffected.
- **In scope v1:** root babel config; substring match.
- **Out of scope v1:** per-package babel configs in deep monorepos (can extend with the ancestor
  walk from `detect-react-compiler`).
- **Test seeds:** invalid = babel config with the old preset; valid = config with
  `@react-native/babel-preset`, `babel-preset-expo`, no babel config.
- **Open questions:** RN-version-gate to only fire on RN ≥ 0.73, or always (it's deprecated
  regardless)? Recommend gate when the version resolves, else fire.

## 4. `expo-reanimated-v4-requires-new-arch`

**Surface:** project-level check (Expo-gated), reads `package.json` + Expo app config.
`severity: error` (first-launch crash). **Detector precision:** manifest + config.

- **Rule definition:** catches `react-native-reanimated@>=4` (or `react-native-worklets` present)
  while the Expo app config sets `newArchEnabled: false`.
- **Runtime reason:** Reanimated 4 supports only the New Architecture; on the legacy arch it
  hard-crashes on first launch.
- **Detector:** reanimated direct-dep major ≥ 4 (via `getLowestDependencyMajor`) **or**
  `react-native-worklets` present; **and** `app.json` `expo.newArchEnabled === false` (JSON parse),
  or `app.config.{js,ts}` matching `/newArchEnabled["']?\s*:\s*false/` (regex, mirroring
  `detect-react-compiler`'s app-config read).
- **Strong positives:** reanimated `^4.0.0` + `app.json` `"newArchEnabled": false`.
- **False-positive traps:** reanimated v3 (gate on major ≥ 4); version unresolvable
  (`workspace:`/`catalog:`) → skip; fully-dynamic `app.config.js` value → false-negative, accepted.
- **In scope v1:** Expo projects; static `app.json` + simple `app.config` regex.
- **Out of scope v1:** bare-RN `android/gradle.properties` / `Podfile.properties.json` newArch
  toggle (native files).
- **Test seeds:** invalid = reanimated 4 + `newArchEnabled:false`; valid = reanimated 3 +
  `newArchEnabled:false`, reanimated 4 with no flag (default-on), reanimated 4 + `newArchEnabled:true`.
- **Open questions:** read `app.config.js`/`.ts` via regex (recommended) or `app.json` only?
  Needs an app-config reader helper (new; pattern exists in `detect-react-compiler`).

## 5. `rn-no-panresponder`

**Surface:** AST rule, `rules/react-native/`, `requires: ["react-native"]`, `severity: warn`.
**Detector precision:** scope-aware.

- **Rule definition:** catches use of `PanResponder` imported from `'react-native'`.
- **Runtime reason:** `PanResponder` processes gestures on the JS thread, dropping frames under
  load; `react-native-gesture-handler` runs them on the UI thread.
- **Detector:** `ImportDeclaration` from `'react-native'` with a named specifier whose imported
  name is `PanResponder` → flag the specifier (mirrors `rn-prefer-expo-image`).
- **Strong positives:** `import { PanResponder } from "react-native"`.
- **False-positive traps:** a `PanResponder` from another module / local symbol (resolve the
  source); RNGH not installed (still flag — recommend adding it).
- **In scope v1:** the named import from `'react-native'`.
- **Out of scope v1:** namespace usage `RN.PanResponder.create` (rare); autofix (the fix is an
  RNGH refactor, not a swap — message-only).
- **Test seeds:** invalid = the named import; valid = `import { PanResponder } from "./my-utils"`,
  RNGH `Gesture.Pan()` usage.
- **Open questions:** none blocking.

## 6. `rn-no-image-children`

**Surface:** AST rule, `rules/react-native/`, `requires: ["react-native"]`, `severity: error`
(children silently disappear). **Detector precision:** scope-aware + JSX.

- **Rule definition:** catches children inside a React Native `<Image>` (which does not render
  them); should be `<ImageBackground>`.
- **Runtime reason:** RN `Image` renders no children, so any layered content silently disappears.
- **Detector:** `JSXElement` whose opening-element name resolves (via `resolveJsxElementName` +
  `getImportedNameFromModule`) to `Image` from `'react-native'`, with ≥ 1 **meaningful** child.
  Meaningful = `JSXElement`/`JSXFragment`, non-whitespace `JSXText`, or `JSXExpressionContainer`
  whose expression is not `null`/`undefined`/`false`/`JSXEmptyExpression`.
- **Strong positives:** `<Image source={s}><Text>hi</Text></Image>`;
  `<Image source={s}>{badge}</Image>`.
- **False-positive traps:** `expo-image` `Image` (resolve to RN only); custom/`styled(Image)`
  (won't resolve → false-negative, accepted); self-closing `<Image/>`; whitespace/comment/`{false}`
  /`{null}`-only children.
- **In scope v1:** RN `Image` element with meaningful children.
- **Out of scope v1:** wrapper components aliasing RN `Image`.
- **Test seeds:** invalid = element + text child, element + `{expr}` child, element + nested element;
  valid = self-closing, whitespace-only, `expo-image` Image with children, custom `Image` with children.
- **Open questions:** `error` vs `warn` (recommend `error`).

## 7. `expo-no-non-inlined-env`

**Surface:** AST rule (Expo-gated), `rules/react-native/` bucket with `isExpoManagedFileActive`
gate, `severity: error` (value is `undefined` at runtime). **Detector precision:** syntax +
file-scope. (Ports eslint-plugin-expo `no-dynamic-env-var` + `no-env-var-destructuring`.)

- **Rule definition:** catches computed `process.env[x]` access and `const { X } = process.env`
  destructuring, which `babel-preset-expo` cannot inline.
- **Runtime reason:** Metro/Babel only inline static `process.env.NAME`; computed or destructured
  reads are left as `undefined` at runtime.
- **Detector:** (a) `MemberExpression` whose object is `process.env` and `computed === true`;
  (b) `VariableDeclarator` whose `init` is `process.env` and `id` is an `ObjectPattern` (also flag
  `{ ...process.env }` spread). Run only when `classifySecretFileExposure(file)` is `client` or
  `unknown`, and `isExpoManagedFileActive` is true.
- **Strong positives:** `process.env["EXPO_PUBLIC_API_URL"]`; `process.env[key]`;
  `const { EXPO_PUBLIC_API_URL } = process.env`.
- **False-positive traps:** Node/build/server files — `*.config.*`, `metro.config`, `babel.config`,
  `app.config`, `scripts/`, and Expo Router API routes (`*+api.ts`) read dynamic env legitimately →
  exclude via file classification (+ an explicit `+api` exclusion); aliased `const e = process.env;
e[x]` → false-negative (accepted, matches upstream); static `process.env.NAME` → not flagged.
- **In scope v1:** computed access + object-pattern/spread destructuring, in Expo client/unknown files.
- **Out of scope v1:** non-Expo RN env handling; alias tracking.
- **Test seeds:** invalid = computed access + destructuring in a client file; valid = static dotted
  access, computed access in `app.config.ts` / `metro.config.js` / `scripts/` / `*+api.ts`.
- **Open questions (resolved):** ship as **one merged rule** `expo-no-non-inlined-env` (decided).
  Remaining: confirm the Expo Router `*+api.*` route exclusion list.

## 8. `expo-updates-no-unsafe-production-config`

**Surface:** project-level check (Expo-gated), reads Expo app config. `severity: error`.
**Detector precision:** config parse/regex.

- **Rule definition:** catches `expo.updates.disableAntiBrickingMeasures: true` in the Expo app
  config.
- **Runtime reason:** disabling anti-bricking measures can leave installed apps permanently
  bricked; the docs state it must never be used in production.
- **Detector:** `app.json`/`app.config.json` → JSON parse `expo.updates.disableAntiBrickingMeasures
=== true`; `app.config.{js,ts}` → regex `/disableAntiBrickingMeasures["']?\s*:\s*true/`.
- **Strong positives:** `"updates": { "disableAntiBrickingMeasures": true }` in `app.json`.
- **False-positive traps:** none meaningful (the flag is non-production by definition);
  fully-dynamic `app.config.js` value → false-negative, accepted.
- **In scope v1:** the single unambiguous `disableAntiBrickingMeasures` field.
- **Out of scope v1:** `useEmbeddedUpdate:false`, `useNativeDebug:true` (nuanced, legit advanced
  uses) — future, separate consideration.
- **Test seeds:** invalid = the flag `true` in app.json and in app.config.ts; valid = flag absent,
  flag `false`.
- **Open questions:** needs the shared app-config reader (same one as rule 4).

## 9. `rn-detox-missing-await`

**Surface:** AST rule scoped to e2e files, `rules/react-native/`, `severity: warn`. **Detector
precision:** path/shape-aware (statement-level await check). _Most complex of the set._

- **Rule definition:** catches an un-awaited Detox action/expectation used as a bare statement.
- **Runtime reason:** Detox actions, `waitFor` chains, and `expect(...)` matchers return promises
  tied to Detox's synchronization; not awaiting them causes out-of-order steps, races, and
  unhandled rejections.
- **Detector:** in files matching `/\.e2e\.[jt]sx?$/` (Detox convention), flag an
  `ExpressionStatement` whose expression is a Detox **terminal** call and is not wrapped in
  `await` / `return` / `.then(...)` / `Promise.all([...])` / an assignment. Terminal calls:
  - an action method (`tap, multiTap, longPress, longPressAndDrag, swipe, scroll, scrollTo,
scrollToIndex, typeText, replaceText, clearText, tapReturnKey, pinch, setColumnToValue,
performAccessibilityAction`) on an `element(...)` chain;
  - a `waitFor(...)....withTimeout(...)` chain;
  - an `expect(element(...))....<matcher>()` chain (require the argument to `expect` to be an
    `element(...)`/`web(...)`/`by`-chain so Jest `expect(value)` is excluded).
- **Strong positives:** `element(by.id('x')).tap();`;
  `expect(element(by.id('y'))).toBeVisible();`; `waitFor(element(by.id('z'))).toBeVisible().withTimeout(1000);`.
- **False-positive traps:** matcher construction (`const el = element(by.id('x'))`) — a
  `VariableDeclarator`, not a terminal `ExpressionStatement`; Jest `expect(value).toBe(...)` —
  excluded by the `expect(element(` shape; already `await`/`return`/`.then`/`Promise.all`; a custom
  async helper call (false-negative, accepted).
- **In scope v1:** `.e2e.` files; element actions, `waitFor`, `expect(element(...))`.
- **Out of scope v1:** non-`.e2e.` e2e layouts (gate misses them); `device.*` async methods
  (optional add); custom wrapper helpers.
- **Test seeds:** invalid = each positive un-awaited; valid = each positive awaited, matcher
  construction, a Jest `expect(x).toBe(y)`, an `await Promise.all([... .tap() ...])`.
- **Open questions:** confirm the e2e filename/`detox` config gate; include `device.*` methods?

## 10. `rn-library-react-in-dependencies`

**Surface:** project-level check, reads `package.json`. `severity: warn`. **Detector precision:**
manifest.

- **Rule definition:** catches a `react-native-builder-bob` library that lists `react` or
  `react-native` in `dependencies` (they belong in `peerDependencies`).
- **Runtime reason:** bundling them as deps installs a second copy of React/native modules in
  consumer apps → "Invalid hook call" and duplicate-native-module crashes.
- **Detector:** gate — `package.json` has a `react-native-builder-bob` key **or** bob in
  `devDependencies` (it's a library). Then flag `dependencies.react` and/or
  `dependencies["react-native"]`.
- **Strong positives:** a bob library with `"dependencies": { "react-native": "0.74.0" }`.
- **False-positive traps:** apps (no bob config) — strict bob gate; the monorepo `example/` app's
  own `package.json` (analyze only the package that has bob config); `react`/`react-native` in
  `devDependencies` or `peerDependencies` is correct → only flag `dependencies`.
- **In scope v1:** `react` / `react-native` in `dependencies` of a bob library.
- **Out of scope v1:** other native peers (reanimated, gesture-handler, …) — future allowlist;
  the missing-peer-dependency variant is a separate rule.
- **Test seeds:** invalid = bob `package.json` with react-native in `dependencies`; valid = same in
  `peerDependencies`/`devDependencies`, an app (no bob) with react-native in `dependencies`, the
  example app's package.json.
- **Open questions:** none blocking.

---

## Stage 3 — RDE eval validation results (implemented rules)

Ran the **implemented** rules (built react-doctor) over the RN/Expo OSS cache
(`~/.cache/rde/repos`): **666 rootDirs scanned across 103 RN/Expo repos, 8 failed**. Scans used
`--warnings` (9 of the 10 rules are `warn` severity, which react-doctor hides by default — the eval
harness invokes `--json --offline --full` with **no `--warnings`**, so a plain harness run surfaces
only the one `error`-severity rule; see the harness note below).

| Rule                                       | Hits | Verdict                                                                                                                                                |
| ------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rn-no-set-native-props`                   | 44   | ✅ TP (spot-checked polarsource/polar `scrollRef.current?.setNativeProps(...)`; matches the `.current(?.)` ref shape)                                  |
| `rn-no-metro-babel-preset`                 | 14   | ✅ TP (gitpoint/berty/rainbow/react-native-config real `module:metro-react-native-babel-preset`; Expensify's comment correctly NOT flagged)            |
| `rn-no-panresponder`                       | 12   | ✅ TP (joplin/berty/storybook/cometchat named `PanResponder` imports)                                                                                  |
| `rn-detox-missing-await`                   | 5    | ✅ TP (react-native-screens `Test432.e2e.ts`: real un-awaited `waitFor(...).toBeVisible()` the author missed — every other action is awaited)          |
| `rn-no-image-children`                     | 3    | ✅ TP (febobo RN `<Image>` wrapping a `<Video>`; import-resolved to react-native)                                                                      |
| `rn-no-deep-imports`                       | 3    | ⚠️ 2 TP (berty `NewAppScreen`, Grashjs `ScrollView/ScrollView` type) + **1 FP fixed**                                                                  |
| `rn-library-react-in-dependencies`         | 1    | ❌ **FP fixed** (fired on `react-native-rag/example`)                                                                                                  |
| `expo-no-non-inlined-env`                  | 0    | ✅ no hits — consistent with idea-validation (client-code violations rare; the dynamic `process.env` lives in config/scripts, which the rule excludes) |
| `expo-reanimated-v4-requires-new-arch`     | 0    | ✅ guardrail — no corpus project pairs reanimated v4 with `newArchEnabled:false`                                                                       |
| `expo-updates-no-unsafe-production-config` | 0    | ✅ guardrail — no corpus app sets `disableAntiBrickingMeasures`                                                                                        |

### Two false positives found and fixed (with regression tests)

1. **`rn-library-react-in-dependencies`** fired on `software-mansion-labs/react-native-rag/example`
   — the example app lists `react-native-builder-bob` in **devDependencies** (to build the local
   lib) but has no bob **config block**. Fix: gate strictly on the `"react-native-builder-bob": {…}`
   config block (which only the library declares), not the dependency. Re-scan: now clean.
2. **`rn-no-deep-imports`** fired on `damianstone/toogether-mobile`'s
   `import { linear } from "react-native/Libraries/Animated/Easing"` — but the root exports the
   `Easing` object, not `linear`, so "import from react-native" was wrong advice. Fix: dropped the
   namespace module `Easing` from the public-export set and made the message **generic** (no symbol
   name), so leaf-component modules that also source types (e.g. `NativeScrollEvent` from
   `ScrollView/ScrollView`) stay correctly flagged. Re-scan: FP clean, both TPs preserved.

After the fixes: **8/10 rules clean TP, 2 guardrails correctly silent, 0 known false positives**;
focused unit + regression tests, typecheck, lint, and format all pass.

### Harness note (feedback for the evals repo)

`src/ReactDoctorV2.ts` invokes react-doctor with `--json --offline --full` but **not
`--warnings`**, so the harness only captures `error`-severity diagnostics. Most rule families (incl.
9 of these 10) are `warn`. A `--warnings` pass-through (or an eval flag) would let the harness
validate warn-severity rules; for this validation I scanned the cache directly with `--warnings`.
The harness `run` also aborts on a missing cached file (`PlatformError` → `Effect.die`); a
per-repo catch would make large sweeps resilient.

## RDE idea-validation results (OSS cache)

Validated against the local OSS cache at `~/.cache/rde/repos` (**500 repos**; **103 declare
`react-native`**, **56 declare `expo`**). All searches excluded `node_modules`. These are
**idea-validation** (workflow one) numbers — prevalence + false-positive traps from real code —
since the rules aren't implemented yet.

> **Meta-finding (affects every RN rule):** a `react-native` mention in `package.json` does **not**
> mean a file is React Native. `vercel/next.js` landed in the RN list and polluted JSX results with
> `next/image`. Lesson: never trust a repo-level signal; every rule must resolve the actual
> **import source** (for `Image`/`PanResponder`/etc.) or **JSX element → import**, and rely on
> react-doctor's real framework detection rather than a package.json grep.

| Rule                                       | Corpus prevalence                                                                                 | False-positive traps found in real code                                                                                                                                                                                                                                                                                                                                             | Revised verdict                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rn-no-deep-imports`                       | 230 import/re-export hits across ~26 repos                                                        | **Dominated by valid patterns:** Codegen specs (`TurboModule/RCTExport`, `Types/CodegenTypes`, `Utilities/codegenNativeComponent`), **type-only** imports of types not root-exported (`StyleSheet/StyleSheetTypes`, `Types/CoreEventTypes`), RN-library internals (Skia, gesture-handler, screens). Plus 61 `jest.mock` (excluded by design) and 20 `InitializeCore` (allowlisted). | **NARROW substantially** (see revised contract below). The broad "anything under `Libraries/`" is too noisy.                                                                         |
| `rn-no-set-native-props`                   | 128 call sites across 22 repos                                                                    | Many use **optional chaining** `ref.current?.setNativeProps(` (Uniswap, Expensify, cometchat) — the `.current.` regex misses these. Many are `TextInput` `selection`/`text` (a known Fabric-interop holdout).                                                                                                                                                                       | **Solid** — but the detector MUST handle `.current?.` (ChainExpression). Keep `warn`.                                                                                                |
| `rn-no-panresponder`                       | Imported from `react-native` in ~15 repos                                                         | Mostly real; appears in libraries/examples (gesture-handler legacy demo, cometchat).                                                                                                                                                                                                                                                                                                | **Solid.**                                                                                                                                                                           |
| `expo-no-non-inlined-env`                  | 256 computed + 31 destructured across ~19 / 8 expo repos                                          | **~All in `scripts/`, `tests/`, `babel.config.js`, CLI apps, webpack/rspack config, `server.ts`, expo `tools/`.** Genuine client-code violations were rare.                                                                                                                                                                                                                         | **Conditional → file-scoping is the whole rule.** Low noise _iff_ scoped to Expo client files; **low recall** (few real client violations).                                          |
| `rn-detox-missing-await`                   | 587 `element(by.` calls across 12 real Detox repos                                                | **`.e2e.` filename gate is insufficient** — 907 `.e2e.` files / 41 repos, but many are **backend** e2e (lobe-chat CLI, midday/openstatus API), not Detox. Line-based "bare `element(`" proxy (62) is mostly **multiline-call arguments**, not un-awaited statements.                                                                                                                | **Conditional / intricate** — requires a Detox-signal gate (globals/import/config, not just `.e2e.`) **and** AST statement+await ancestry analysis. Real but the hardest of the set. |
| `rn-no-metro-babel-preset`                 | 12 repos (gitpoint, berty, ReactNativeSchool, rgommezz, …)                                        | Expensify has the string **inside a comment** → match the `module:`-prefixed quoted form, not the bare substring.                                                                                                                                                                                                                                                                   | **Solid** — refine to `module:metro-react-native-babel-preset`.                                                                                                                      |
| `expo-reanimated-v4-requires-new-arch`     | reanimated v4 in ~8 repos (RocketChat, gesture-handler, screens, storybook, better-auth, Bangumi) | **Zero conflicts:** every v4 adopter sets `newArchEnabled: true` (or omits it). `newArchEnabled: false` exists (bluesky, reactotron) but on non-v4 projects.                                                                                                                                                                                                                        | **Guardrail** — ~0 noise, recall unproven (people who adopt v4 already enable new arch). Ship as cheap insurance.                                                                    |
| `expo-updates-no-unsafe-production-config` | **0 real app configs** (41 hits, all inside `expo/expo`'s own source/schema/docs)                 | None in user code.                                                                                                                                                                                                                                                                                                                                                                  | **Guardrail, rare-by-design** — scope to `app.json`/`app.config.*` (never matches in practice unless someone really does it).                                                        |
| `rn-library-react-in-dependencies`         | 43 builder-bob library `package.json`s                                                            | **Only 1** put `react`/`react-native` in `dependencies` — and it was an **`example/` app**, the exact FP trap.                                                                                                                                                                                                                                                                      | **Solid but rare** — the **example-app exclusion is the entire correctness story**; near-zero real positives (maintained libs already do it right).                                  |

### Revised contract: `rn-no-deep-imports` (post-RDE narrowing)

The corpus shows the broad form is **too noisy** — most `react-native/Libraries/...` imports in real
code are legitimate. Narrow v1 to the high-confidence subset:

- **Exclude type-only imports** (`import type … from "react-native/Libraries/..."`). Many of those
  types (`ViewStyle`, `DimensionValue`, `GestureResponderEvent`) are **not** re-exported from the
  `react-native` root, so "import from `react-native`" would be wrong advice. (`node.importKind ===
"type"` and `ExportNamedDeclaration` type specifiers → skip.)
- **Allowlist the Codegen/New-Arch authoring surface** (these are the _documented_ deep paths and
  RFC 0894 keeps them): any source containing `TurboModule/`, `Types/CodegenTypes`,
  `Utilities/codegenNativeComponent`, `Renderer/shims/`, plus `Core/InitializeCore`.
- **Prefer a curated denylist of value-import internals** that have a known public root re-export
  (lead with `react-native/Libraries/NewAppScreen` → `@react-native/new-app-screen`, and a small
  vetted set), rather than flagging the whole `Libraries/` tree. Expand the denylist with evidence.
- This trades recall for precision (the skill's rule: false positives are correctness bugs). Keep
  `warn`, value-imports only, with the Codegen allowlist + type-import exclusion.
- **Open question for v1:** ship as the _narrow denylist_ (lowest noise, lowest recall) or the
  _broad-minus-allowlist_ (higher recall, needs the type-import exclusion to be airtight)? RDE leans
  **denylist** for a clean v1.

### Detector implications carried into stage 2 (rule-writing)

- `rn-no-set-native-props`: match `MemberExpression`/`ChainExpression` for both `.current.` and
  `.current?.` receivers.
- `rn-detox-missing-await`: gate on a Detox signal (e.g. `detox` import/config or `device`/`element`
  globals), not just `.e2e.`; detect via un-awaited terminal `ExpressionStatement`, not line text.
- `rn-no-image-children` / `rn-no-panresponder`: resolve the JSX/identifier back to the
  `react-native` import (never the local name) — the corpus proves same-named non-RN components
  (`next/image`, Skia `Image`, `Shared/Image`) are the main FP source.
- `expo-no-non-inlined-env`: reuse `classifySecretFileExposure`; only fire in `client`/`unknown`
  Expo files; explicitly exclude `*.config.*`, `metro`/`babel`, `scripts/`, `tools/`, `*+api.*`.
- `rn-no-metro-babel-preset`: match `module:metro-react-native-babel-preset` (avoids the comment FP).

## Cross-cutting findings from this stage

- **Drop `rn-no-dynamic-require` (was T2):** `bundle-size/no-dynamic-import-path` **already**
  flags `require(variable)` and ``require(`./${x}`)`` (and dynamic `import()`). Only the
  RN-specific message ("Metro can't bundle the asset → missing at runtime") differs — consider
  enriching that rule's message for RN instead of adding a new rule.
- **`expo-no-non-inlined-env` is net-new:** the only existing `process.env` handling is
  `tanstack-start-no-secrets-in-loader` (unrelated).
- **`rn-no-panresponder` / `rn-no-image-children` are net-new:** `PanResponder` / `ImageBackground`
  appear nowhere in the plugin.
- **App-config reader is shared infra:** rules 4 and 8 both need to read `expo.*` from
  `app.json` / `app.config.*`. Build one helper (pattern already exists in
  `detect-react-compiler.ts`) and reuse it.
