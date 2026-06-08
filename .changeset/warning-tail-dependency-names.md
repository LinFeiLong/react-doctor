---
"react-doctor": patch
---

Name every unused dependency in the verbose warning tail.

Unused-dependency warnings all report at the same line-less location (`package.json:0`), so the dim location header collapsed every finding into one line and dropped the package names — leaving only a generic `deslop/unused-dependency ×N` line (#690). A warning group whose sites all share one line-less location now enumerates each site's message under that location, so `deslop/unused-dependency` and `deslop/unused-dev-dependency` list every package by name. Errors and code-frame rendering are unchanged.
