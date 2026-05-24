# ESLint and oxlint plugins

React Doctor ships standalone lint plugins for teams that already run ESLint or oxlint directly.

Use these when you want React Doctor rules inside your existing lint command instead of running the full CLI.

## oxlint

Install `oxlint-plugin-react-doctor`, then add it to `.oxlintrc.json`:

```jsonc
{
  "jsPlugins": [{ "name": "react-doctor", "specifier": "oxlint-plugin-react-doctor" }],
  "rules": {
    "react-doctor/no-fetch-in-effect": "warn",
    "react-doctor/no-derived-state-effect": "warn",
  },
}
```

## ESLint

Install `eslint-plugin-react-doctor`, then use the flat config presets:

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

## CLI adoption

The React Doctor CLI can adopt existing JSON ESLint and oxlint config by default. Use standalone plugins when you want lint-tool-native integration.
