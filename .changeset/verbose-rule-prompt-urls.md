---
"react-doctor": patch
---

Pair each error and warning in `--verbose` output with its canonical per-rule fix recipe at `https://www.react.doctor/prompts/rules/<plugin>/<rule>.md`. Every rule group now prints a `Fix recipe:` line (also written into the verbose diagnostics dump), so the `/doctor` playbook can fetch the reviewer-tested recipe on demand and apply the canonical fix instead of improvising per diagnostic.
