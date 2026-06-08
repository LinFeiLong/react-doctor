---
"react-doctor": patch
---

CI setup: collapsed the multi-line inline comments in the generated `.github/workflows/react-doctor.yml` to a single explanatory sentence per block (triggers, permissions, concurrency). The resulting workflow still configures the same triggers, permissions, and action ref — just with less scrolling for new users.
