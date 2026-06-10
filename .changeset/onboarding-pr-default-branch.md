---
"react-doctor": patch
---

CI onboarding now resolves the repository's actual default branch instead of assuming `main`. The pull request opened during setup asks GitHub (`gh repo view`) for the default branch — falling back to `origin/HEAD`, then `main`/`master` — and uses it as the PR base, and the installed workflow's push trigger scans that same branch (`master`, `develop`, …) so the health-score trend works on repos whose default branch isn't `main`.
