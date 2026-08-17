# Can EWP schema generation support multiple mod versions?

Type: research
Status: resolved
Blocked by: (none)

## Question

Investigate whether Jere's EWP repo has tagged releases/version branches accessible via GitHub (API or otherwise) that would let us generate and host a distinct schema per EWP version, enabling a version-picker dropdown in the toolkit — or whether "latest only" is the realistic ceiling for v1. Report the mechanism and the effort level required.

Save findings to `.scratch/ew_toolkit/research/03-multi-version-feasibility.md`.

## Answer

Ship latest-only for v1; version-picker is a well-scoped fast-follow, not a v1 requirement. Full findings: [research/03-multi-version-feasibility.md](../research/03-multi-version-feasibility.md).

**Update 2026-08-17 — version-picker fast-follow DROPPED.** Always tracking the latest public release is sufficient; the version-picker will not be built. Rationale: the research assumed a doc-parsing generator (so 30 historical schemas were "mechanical"), but the generator that actually shipped (`schema/generate.mjs`) is a hand-encoded static schema that only stamps the current `_meta.ewpVersion` from `manifest.json`. Faithful per-version schemas would require hand-encoding each version's deltas — far more than the estimated ~1–2 days, and not worth it at this stage. The generator already tracks latest on every run, so latest-only needs no further work. Do not re-open unless a concrete scripter need for older-version validation appears.

- No GitHub tags/releases exist (confirmed via API and web UI) — Jere versions via Thunderstore, not git refs. `publish/manifest.json`'s own commit history reconstructs a reliable version↔SHA mapping instead: 30 dated versions, 2024-12-31 → 2026-08-15 (~v1.29 → v1.58).
- The schema genuinely changes across that range (trigger-type enum changed, whole field groups added, documented breaking changes) — multi-version support would be real value, not busywork, once built.
- No hard blocker for building it, but one real cost: docs were reorganized at some point from flat root `README.md` into a `docs/` folder — a version-aware generator needs to branch on doc-layout era, not just fetch the same path at different SHAs. Estimated ~1–2 extra days on top of a working latest-only pipeline.
- Recommendation adopted: build latest-only first (feeds ticket 02's generator), treat multi-version as a fast-follow once that's stable — the mechanism is already de-risked so it won't need re-research later.
