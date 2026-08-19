# Move category labels into the catalog

Type: task
Status: closed — out of scope
Blocked by: [Extract message wording into messages.yaml + build-time validator](03-extract-messages-to-catalog.md)

## Question

The redesigned grouping decided in
[Redesign the diagnosis category grouping](01-category-grouping-redesign.md)
is already **live in code** — `diagnosisCategories.ts` is the sole source for
the 5 category constants (`Structure problem`, `Value problem`, `Reference
problem`, `Invalid file`, `Legacy but working`), every call site across
`structuralPrecheck.ts`/`formatLint.ts`/`fileNameCheck.ts`/`fileManager.ts`
was reclassified, and the two-line tag (kind + schema-shape subtitle) is
rendering. So this ticket's scope narrowed from "redesign + move" to just:
**move those same 5 constants' wording into the YAML catalog**, once the
catalog mechanism itself exists (ticket 03), so a category label becomes
editable the same way a message is — per the scripter's explicit ask that
"future system should use the same standard with diagnosis messages so they
match and maintain consistency."

Covers:

1. The 5 category constants (currently plain string literals in
   `diagnosisCategories.ts`) move into the catalog file, keeping
   `diagnosisCategories.ts` as the code-side accessor (reads from the
   catalog rather than hardcoding the string) so every existing import site
   needs no further change.
2. The `entryType` subtitle values (`ENTRY_TYPE_TITLES` in
   `structuralPrecheck.ts` — EWP rule entry / WEC data entry / Value entry /
   Value group) — decide whether these also move into the catalog (they're
   schema-shape names, not really "message wording," so may reasonably stay
   as code constants; a judgment call for whoever picks this up, informed by
   how ticket 03 shapes the catalog's scope).
3. Regression tests referencing the category constants updated to read from
   the catalog instead of the plain exported string, if the accessor shape
   changes.

## Resolution

**Closed — out of scope (2026-08-20).** YAML catalog dropped. Category labels remain code constants from ticket 01 (plus **YAML problem** from Round 3).

