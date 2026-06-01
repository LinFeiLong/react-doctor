---
"react-doctor": patch
---

The interactive category breakdown now reveals issues one at a time — a category's errors before its warnings, top to bottom — instead of every count easing up in parallel, holds for a beat once it settles, and finally plays on monorepo (multi-project) scans too.

Previously the count-up only animated on single-project scans; the multi-project aggregate report rendered the breakdown (and the score projection) statically. Both now share the same interactive reveal, gated on the same real-TTY predicate, so a monorepo's report animates like a single project's. Small and medium breakdowns step one issue per frame; very large ones grow the per-step increment so the reveal still resolves quickly.
