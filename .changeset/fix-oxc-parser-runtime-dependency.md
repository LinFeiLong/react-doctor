---
"oxlint-plugin-react-doctor": patch
---

Fix `react-doctor@latest` (and the ESLint/oxlint plugins) crashing before the scan starts with `ERR_MODULE_NOT_FOUND: Cannot find package 'oxc-parser'` under strict package managers like pnpm. The published `oxlint-plugin-react-doctor/dist/index.js` performs a runtime `import { parseSync } from "oxc-parser"` (cross-file parsing for rules like `no-mutating-reducer-state`) and the build intentionally keeps `oxc-parser` external, but the package only declared it under `devDependencies`, so consumers never had it installed. `oxc-parser` is now a real `dependency`. See #629.
