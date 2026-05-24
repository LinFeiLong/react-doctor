# PR feedback

React Doctor can report findings in several PR surfaces.

Use one or combine them depending on how visible you want findings to be.

## CI logs

Every CI run includes terminal output. This is the lowest-friction option, but reviewers have to open the failed check to see details.

## GitHub annotations

Set `annotations: true` in the GitHub Action:

```yaml
with:
  annotations: true
```

Annotations show findings inline in GitHub’s Files changed view.

## Sticky PR comments

Pass `github-token` to post or update a React Doctor PR comment:

```yaml
with:
  github-token: ${{ secrets.GITHUB_TOKEN }}
```

The comment includes scan output and the score when available.

## PR comment surface

When PR comments are enabled, React Doctor uses the `prComment` output surface. By default, weak-signal design cleanup is excluded from PR comments so the comment stays focused.

You can tune this in config with `surfaces.prComment`.
