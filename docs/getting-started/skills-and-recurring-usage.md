# Skills and recurring usage

The React Doctor skill gives coding agents a repeatable quality loop.

After installation, agents know to run React Doctor when finishing a feature, fixing a bug, or changing React code.

## Agent skill

The installed skill is plain Markdown. It tells agents to run:

```bash
npx react-doctor@latest --verbose --diff
```

Use this for normal coding sessions. The agent decides when the skill is relevant, or you can ask explicitly.

## Git hook

The Git hook runs before commits:

```bash
react-doctor --staged --fail-on none
```

It is non-blocking. It keeps findings visible without stopping commits.

## Native agent hook

Native Claude Code and Cursor hooks run after agent edits. They scan changed files and feed findings back into the agent session.

Use native hooks when you want the agent to self-correct during the session. Leave them off if you want less context usage and prefer manual scans or Git hook feedback.
