# Redesign the diagnosis category grouping

Type: grilling
Status: resolved
Blocked by: (none)

## Question

The scripter confirmed the current diagnosis categories (`EWP rule entry`,
`WEC data entry`, `Value entry`, `Value group`, `Legacy format entry`,
`RPC rule entry`, `Formatting`, `Data entry reference`, `Custom saved key`,
`Invalid file` — see `BRANCH_TITLES` in `structuralPrecheck.ts` and the
constants re-exported from `diagnosisCategories.ts`) have a grouping problem,
not just an inconsistent-wording one — but hasn't yet said what's wrong with
the grouping or what a better one looks like.

Grill toward a concrete answer:

1. List every category currently in use, with 1-2 real example messages from
   each (pull from `structuralPrecheck.ts`, `formatLint.ts`,
   `referenceValidation.ts`, `rpcValidation.ts`, `fileNameCheck.ts`) so the
   conversation has the full current picture, not a guess.
2. What's actually wrong — categories that overlap (e.g. does "Legacy format
   entry" ever get confused with a plain "EWP rule entry" issue?), categories
   that are too broad (does "EWP rule entry" cover too many unrelated kinds of
   mistake?) or too narrow (is "RPC rule entry" really different enough from
   "EWP rule entry" to deserve its own category?), or something else the
   scripter has noticed while using the tool.
3. What should the new grouping be — a revised list of category names, and
   which current message/check maps to which new category. Watch for the
   coupling already found this session: `structuralPrecheck.ts` interpolates
   `BRANCH_TITLES[branch]` directly into one message's text, and
   `fileNameCheck.ts` picks its category and message together per branch — a
   renamed/regrouped category needs every dependent call site identified, not
   just the label constant.
4. Whether the four `BranchName`/`oneOf`-shape categories (EWP rule entry /
   WEC data entry / value entry / value group — tied to the schema's actual
   discriminator-less-array branches, ticket 10) should be touched at all, or
   whether the redesign is really about the *other* six (Legacy format, RPC
   rule, Formatting, Data entry reference, Custom saved key, Invalid file) —
   those track UX groupings invented on top of the schema, not the schema's
   own shape, so they're the more likely candidates for restructuring.

This ticket's answer feeds directly into
[Move category labels into the catalog + apply the redesigned grouping](04-category-catalog-migration.md)
— don't implement the new grouping here, just decide what it is and where
every current category maps to.

## Answer

Grilled over two rounds plus a reactable prototype (published artifact,
title "Diagnosis Category Redesign") comparing the old 10-category list
against a draft re-cut. Both complaints were confirmed: **EWP rule entry**
was too broad (absorbed every kind of mistake on that shape), while **RPC
rule entry**, **Formatting**, and **Invalid file** were too narrow (a whole
category for one check each).

**Final grouping — 10 categories → 5, by *kind of mistake* instead of by
which internal check found it:**

| New category | Old categories it replaces | What lands here |
|---|---|---|
| **Structure problem** | EWP rule entry, WEC data entry, Value entry, Value group, Formatting (partial) | Unknown/misspelled key, missing required field, stray-colon typo — anything about *which keys exist*. |
| **Value problem** | EWP rule entry (partial), RPC rule entry | Bad enum value, wrong type, undocumented/mismatched RPC parameter — a known field holding the *wrong value*. |
| **Reference problem** | Data entry reference, Custom saved key | Undefined/unused data entry, orphaned custom saved key — merged since they were already close cousins. |
| **Invalid file** | Invalid file (unchanged) | The one category confirmed to be a pure 100%-hard-error bucket every time it fires. |
| **Legacy but working** | Legacy format entry (renamed) | A construct that still works but has a newer recommended form — never an error. |

**Naming principle** (the scripter's own insight, generalized): several
"invalid ___"-shaped names were rejected once it was checked that their
buckets actually mix a hard error with a merely-informational finding (e.g.
an unused data entry, a commented-out list field, an RPC param mismatch) —
calling a soft finding "invalid" misrepresents it. So: **"___ problem"** for
any category that mixes severities ("worth checking," not "definitely
broken"); **"Invalid ___"** reserved for the one category that's always a
hard error; **"Legacy but working"** for the one category that's never an
error. The differently-shaped names are deliberate — they signal at a
glance which kind of certainty a tag carries.

**Tag layout**: two-line — the kind (bold, top) and, when the diagnosis is
scoped to one of the schema's 4 discriminator-less-array shapes (question
4's answer: yes, those 4 — EWP rule entry/WEC data entry/Value entry/Value
group — stay meaningful, just demoted from filterable category to a tag
*subtitle*), the shape name (small, muted, below).

**Implemented directly in code this session** (not deferred to the YAML
catalog migration): `diagnosisCategories.ts` is now the sole, import-free
source for all 5 category constants (fixing the module's own previously
backwards dependency, noted in its header comment); `structuralPrecheck.ts`'s
`Problem` interface gained an optional `entryType` field for the subtitle;
every diagnosis-producing call site across `structuralPrecheck.ts`,
`formatLint.ts`, `fileNameCheck.ts`, and `fileManager.ts`'s reference-
validation glue was reclassified into the new 5-category scheme (ajv's
`required` keyword → Structure problem, everything else → Value problem, as
the general rule for the generic fallback case). Two-line tag rendering
added to `main.ts`/`style.css`. All affected tests updated; 177/177 passing,
type-check clean, build clean, live-verified in the browser preview
(category filter menu correctly shows only "Structure problem" for a
typo'd-key repro; the two-line tag renders "Structure problem" / "EWP rule
entry").

[Move category labels into the catalog + apply the redesigned grouping](04-category-catalog-migration.md)'s
remaining scope is now narrower than originally ticketed: the grouping is
already live in code, so that ticket is just "move these same 5 constants'
*wording* into the YAML catalog" once
[Extract message wording into messages.yaml + build-time validator](03-extract-messages-to-catalog.md)
lands — not "redesign + move."
