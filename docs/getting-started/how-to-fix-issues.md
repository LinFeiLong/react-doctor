# How to fix issues

React Doctor diagnostics point to specific files, lines, rules, and recommendations.

Start with the highest-severity issues, then work down.

## Recommended workflow

1. Run a diff scan:

   ```bash
   npx react-doctor@latest --verbose --diff
   ```

2. Fix `error` diagnostics first.
3. Re-run the same command.
4. Fix warnings that represent real product or maintainability risk.
5. Suppress only when the code is intentionally unusual.

## Understand a diagnostic

Use `--explain` when a rule is confusing or a suppression is not working:

```bash
npx react-doctor@latest --explain src/App.tsx:42
```

The alias `--why` works too:

```bash
npx react-doctor@latest --why src/App.tsx:42
```

## Suppress only when needed

Prefer fixing the root cause. When a suppression is appropriate, keep it narrow:

```tsx
// react-doctor-disable-next-line react-doctor/no-derived-state-effect
useEffect(() => {
  setValue(expensiveInitialValue);
}, []);
```

Use comma-separated rule names for multiple suppressions on one line.
