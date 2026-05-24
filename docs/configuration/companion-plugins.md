# Companion plugins

React Doctor can run custom oxlint-shaped plugins from your config.

Use this for team-specific conventions that do not belong in the core rule set.

## Example

```json
{
  "plugins": ["./lint/team-conventions.cjs"],
  "rules": {
    "team-conventions/no-bare-fetch": "error"
  }
}
```

## Plugin shape

Plugins export `meta` and `rules`:

```js
module.exports = {
  meta: {
    name: "team-conventions",
  },
  rules: {
    "no-bare-fetch": {
      create(context) {
        return {};
      },
    },
  },
};
```

Rule keys use:

```text
<plugin-name>/<rule-name>
```

Plugin rules are opt-in. They flow through the same CLI, score, PR comment, and CI surfaces as built-in rules.
