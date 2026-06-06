---
"oxlint-plugin-react-doctor": patch
---

refactor: extract the shared `isBooleanPrefixedPropName` predicate into a single-purpose util and reuse it in `no-many-boolean-props`. Behavior-preserving.
