---
"react-doctor": minor
---

Cleaner scan output and smarter file scoping:

- The post-scan summary now leads with a "Top errors you should fix" block — each error shows a plain-language explanation and an inline code frame, with the rule's human title instead of its id.
- Every rule's messages were rewritten to be short, plain, and dash-free, and each rule now carries a short `title`.
- Generated bundler output (`*.iife.js` / `*.global.js`) is now excluded from scans by default. As a result `project.sourceFileCount` (and the scanned-file totals) no longer count these generated bundles.
- Multi-project scans now report the number of UNIQUE files scanned, so nested workspace packages (a parent whose tree contains a child package) are no longer double-counted in the "Scanned N files" total.
