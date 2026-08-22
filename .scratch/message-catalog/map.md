# Editable Message & Category Catalog — Map

## Destination

~~A single YAML catalog the scripter edits and pushes to reword diagnoses without an agent.~~ **Abandoned 2026-08-20.** The scripter judged YAML extraction, legend generation, and a build-time wording validator as too little return for the machinery.

**What this map actually delivered:** diagnosis **category grouping** in code (`diagnosisCategories.ts`) — FILTER names a scripter can read — via [Redesign the diagnosis category grouping](issues/01-category-grouping-redesign.md). Message **wording** stays in TypeScript. New English continues to land in domain modules / Diagnosis Arbitration, not in `messages.yaml`.

## Notes

- Domain: `ewp_validator` diagnosis-message UX. Sub-effort of the
  [EW Toolkit map](../ew_toolkit/map.md).
- **2026-08-20:** remaining tickets closed as out of scope (YAML catalog dropped). Do not reopen 02–05 unless the destination is redrawn.
- Skills: `/grilling` + `/domain-modeling` were used for ticket 01; leftover mechanism grilling was stopped.

## Decisions so far

- **Scope (charting, later partly abandoned):** wording-only catalog vs editable branch logic — the YAML half was dropped; branch-selection still lives in code (unchanged).
- [Redesign the diagnosis category grouping](issues/01-category-grouping-redesign.md) — 10 categories → 5 (later **YAML problem** as a sixth FILTER name on Validator Round 3). Naming: "___ problem" for mixed-severity buckets, "Invalid ___" only for hard-error buckets. Implemented in `diagnosisCategories.ts`, live-verified.

## Not yet specified

(none — YAML destination abandoned; category grouping shipped)

## Out of scope

- **A live in-app editor / GitHub-API-backed write path.** Ruled out at charting ($0 / no backend).
- **Making the branching/selection logic itself editable.** Ruled out at charting.
- **[Design the legend-generation mechanism and placeholder syntax](issues/02-legend-generation-mechanism.md)** — closed unused; YAML catalog dropped (ROI).
- **[Extract message wording into messages.yaml + build-time validator](issues/03-extract-messages-to-catalog.md)** — closed unused; wording stays in TypeScript.
- **[Move category labels into the catalog](issues/04-category-catalog-migration.md)** — closed unused; labels already live as code constants (ticket 01). Moving them into YAML had no remaining destination.
- **[Cleanup pass: remove redundant/overlapping message code](issues/05-message-generation-cleanup.md)** — closed unused; it was scoped to “after everything is in one catalog.” Dead-rule cleanup can return as its own map if wanted, not as catalog follow-on.
