---
"react-doctor": patch
---

Polished the first-run onboarding experience — the animated welcome scene now plays on every interactive regular-mode run (not just the first) but at half the cadence for returning users (`hasCompletedOnboarding()`), `--verbose` skips the intro entirely and goes straight to the static branded header, and the closing `"Let's scan your codebase..."` typewriter beat was cut so the intro ends on the tagline.

Restructured the scan-report layout so the top-errors detail (code frames + fixes) leads the report and the per-category breakdown moves down as a wrap-up overview directly above the score. The breakdown now has its own bold `All N issues` header (mirroring `Top N errors you should fix`) with the total folded into the header text, categories sort in a fixed Security → Bugs → Performance → Accessibility → Maintainability order, and warnings no longer get boxed code frames in `--verbose` (errors still do) so a long warning tail stops drowning the report. The trailing `--verbose` CTA drops the redundant `+N more rules and +N optional warnings` stats (the breakdown above already carries those) and reads as a clean `Run npx react-doctor@latest --verbose to list every error and warning`.
