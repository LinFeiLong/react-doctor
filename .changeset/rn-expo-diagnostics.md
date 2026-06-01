---
"react-doctor": patch
---

Add 10 React Native & Expo diagnostics (researched against first-party docs/RFCs and validated against an OSS corpus). Six are oxlint AST rules; four are project-level checks gated on the React Native / Expo capability and run in the environment-checks phase (skipped in diff/staged mode).

AST rules:

- `rn-no-deep-imports` — deep imports of public symbols from `react-native/Libraries/*` (RFC 0894; breaks on upgrade). Curated to symbols re-exported from the root, with a tailored message for the relocated `NewAppScreen`; skips type-only imports and the Codegen/TurboModule authoring surface.
- `rn-no-set-native-props` — `ref.current(?.).setNativeProps(...)`, a silent no-op under the New Architecture (Fabric).
- `rn-no-image-children` — children inside react-native's `<Image>` (which renders none); use `<ImageBackground>`. Resolves the element to the `react-native` import so `expo-image`/custom `Image` are ignored.
- `rn-no-panresponder` — `PanResponder` imported from `react-native` (JS-thread gestures); use `react-native-gesture-handler`.
- `rn-detox-missing-await` — un-awaited Detox actions / `waitFor` / `expect(element(...))` in `*.e2e.*` files.
- `expo-no-non-inlined-env` — computed `process.env[...]` and `process.env` destructuring, which `babel-preset-expo` can't inline (value is `undefined` at runtime); scoped to Expo client files.

Project-level checks:

- `rn-no-metro-babel-preset` — `module:metro-react-native-babel-preset` in a babel config (renamed to `@react-native/babel-preset`; uninstalled on RN 0.73+).
- `rn-library-react-in-dependencies` — a `react-native-builder-bob` library listing `react`/`react-native` in `dependencies` instead of `peerDependencies` (duplicate-React / duplicate-native-module crashes).
- `expo-reanimated-v4-requires-new-arch` — `react-native-reanimated` v4 with `newArchEnabled: false` in the app config (first-launch crash).
- `expo-updates-no-unsafe-production-config` — `updates.disableAntiBrickingMeasures: true` in the app config (can brick installed apps).
