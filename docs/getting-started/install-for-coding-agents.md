# Install for coding agents

Install the React Doctor skill into supported coding agents:

```bash
npx react-doctor@latest install
```

The installer detects available agents, asks which ones to install for, and copies the React Doctor skill into the right project-level directories.

## What gets installed?

The skill tells agents when and how to run React Doctor, usually after changing React code:

```bash
npx react-doctor@latest --verbose --diff
```

This gives the agent a project-specific quality loop without requiring you to paste instructions each time.

## Git pre-commit hook

If the project is a Git repo, the installer can add a non-blocking pre-commit hook:

```bash
react-doctor --staged --fail-on none
```

The hook logs staged-file findings but does not block commits. React Doctor reuses common hook managers when present and falls back to `.git/hooks/pre-commit`.

Supported integrations include:

- existing `core.hooksPath`
- Husky
- Vite Plus
- simple-git-hooks
- Lefthook
- pre-commit
- Overcommit
- Yorkie
- ghooks
- git-hooks-js
- pretty-quick

When a manager owns the hook flow, React Doctor updates that manager's config instead of overwriting its generated hook file.

## Native agent hooks

Claude Code and Cursor also support native lifecycle hooks. The interactive installer offers this as an optional step and defaults to No.

Opt in from scripts or CI with:

```bash
npx react-doctor@latest install --agent-hooks
```

Native hooks run after agent file edits and feed findings back to the agent. Use them when you want agents to react to React Doctor output immediately.

## Non-interactive install

Use `--yes` to skip prompts:

```bash
npx react-doctor@latest install --yes
```

`--yes` installs skills and opts into Git hooks when available. It does not imply `--agent-hooks`.
