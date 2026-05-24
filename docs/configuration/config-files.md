# Config files

React Doctor reads configuration from `react-doctor.config.json` in your project root.

You can also use a `reactDoctor` key in `package.json`.

CLI flags always win over config values.

## Example

```json
{
  "ignore": {
    "rules": ["react-doctor/no-danger"],
    "files": ["src/generated/**"],
    "overrides": [
      {
        "files": ["components/search/HighlightedSnippet.tsx"],
        "rules": ["react-doctor/no-danger"]
      }
    ]
  },
  "rules": {
    "react-doctor/no-array-index-as-key": "error"
  },
  "categories": {
    "React Native": "warn"
  }
}
```

## Common keys

| Key                        | Type                             | Default  | Purpose                                      |
| -------------------------- | -------------------------------- | -------- | -------------------------------------------- |
| `ignore.rules`             | `string[]`                       | `[]`     | Silence a rule everywhere                    |
| `ignore.files`             | `string[]`                       | `[]`     | Silence all rules on matching files          |
| `ignore.overrides`         | `{ files, rules? }[]`            | `[]`     | Silence specific rules for specific files    |
| `lint`                     | `boolean`                        | `true`   | Enable lint diagnostics                      |
| `verbose`                  | `boolean`                        | `false`  | Show more detail                             |
| `diff`                     | `boolean \| string`              |          | Scan only changed files                      |
| `failOn`                   | `"error" \| "warning" \| "none"` | `"none"` | Control non-zero exits                       |
| `customRulesOnly`          | `boolean`                        | `false`  | Run only configured custom rules             |
| `share`                    | `boolean`                        | `true`   | Enable share URL behavior                    |
| `offline`                  | `boolean`                        | `false`  | Skip score API calls                         |
| `textComponents`           | `string[]`                       | `[]`     | React Native text component aliases          |
| `rawTextWrapperComponents` | `string[]`                       | `[]`     | React Native string wrapper components       |
| `serverAuthFunctionNames`  | `string[]`                       | `[]`     | Accepted server auth guard names             |
| `respectInlineDisables`    | `boolean`                        | `true`   | Respect inline lint disables                 |
| `adoptExistingLintConfig`  | `boolean`                        | `true`   | Merge existing JSON lint config              |
| `ignore.tags`              | `string[]`                       | `[]`     | Suppress rule families by tag                |
| `rules`                    | `object`                         |          | Override individual rule severity            |
| `categories`               | `object`                         |          | Override severity for a category             |
| `surfaces`                 | `object`                         |          | Tune CLI, score, PR comments, and CI failure |

## React Native escape hatches

Use `textComponents` for components that behave like React Native's `<Text>`:

```json
{
  "textComponents": ["Typography", "NativeTabs.Trigger.Label"]
}
```

Use `rawTextWrapperComponents` for components that route string children through an internal text component:

```json
{
  "rawTextWrapperComponents": ["Button"]
}
```

## Server auth guards

Use `serverAuthFunctionNames` when your server actions use custom auth helpers:

```json
{
  "serverAuthFunctionNames": ["requireWorkspaceMember", "ensureSignedIn"]
}
```

## Existing lint config

React Doctor can adopt JSON ESLint and oxlint config automatically. Set `adoptExistingLintConfig: false` if you want React Doctor to ignore existing lint config.
