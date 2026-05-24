# Rules, ignores, suppressions

Use rules, ignores, and suppressions to tune diagnostics without losing too much coverage.

Prefer the narrowest control that solves the problem.

## Ignore a rule everywhere

```json
{
  "ignore": {
    "rules": ["react-doctor/no-danger"]
  }
}
```

## Ignore generated files

```json
{
  "ignore": {
    "files": ["src/generated/**"]
  }
}
```

Use this sparingly. It disables every rule for matching files.

## Ignore a rule in specific files

```json
{
  "ignore": {
    "overrides": [
      {
        "files": ["components/search/HighlightedSnippet.tsx"],
        "rules": ["react-doctor/no-danger"]
      }
    ]
  }
}
```

## Inline suppressions

Use an inline suppression when the exception lives with the code:

```tsx
// react-doctor-disable-next-line react-doctor/no-derived-state-effect
useEffect(() => {
  setValue(initialValue);
}, []);
```

Comma-separate multiple rule names when needed.

## Debug suppression issues

Use `--explain` when a suppression does not apply:

```bash
npx react-doctor@latest --explain src/App.tsx:42
```

React Doctor reports what it sees near that line and why the suppression did or did not match.
