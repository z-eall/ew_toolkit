# Redesign diagnosis tags: drop schema-shape subtitle, add YAML-native group

Type: grilling
Status: resolved (2026-08-20)
Blocked by: (none)
Parent: [Validator Round 3 map](../map.md)

## Answer

Grilling + prototype (Q2 variant **B**):

1. **Category name:** `YAML problem` — sixth entry in `DIAGNOSIS_CATEGORIES`.
2. **Tag layout (B):** kind-based categories one bold line; `entryType` schema
   subtitles no longer rendered. YAML problem alone shows muted second line
   for `(parse)` / `(root)` / `(item)` via `shouldShowTagSubline()`.
3. **Filter:** one checkbox for the whole YAML problem group (same as other
   categories); no longer always-visible.
4. **Copy/report:** `formatProblemTag()` — `[YAML problem · (parse)]` for
   YAML-native; branch-only for kind-based (even if `entryType` still set in
   backend). Report dialog picks up YAML problem from `DIAGNOSIS_CATEGORIES`.
5. **Invalid file / Legacy but working:** unchanged.

Emission: `structuralPrecheck.ts` now sets `branch: YAML_PROBLEM_CATEGORY` +
`entryType: YAML_SUBGROUP_*` instead of synthetic `(parse)`/`(root)`/`(item)`
branches.

Prototype (Q2): throwaway `prototype-diagnosis-tags` page, variant B chosen; files deleted after shipping (2026-08-20).

Tests: `diagnosisCategories.test.ts` updated; `vitest run` + `tsc --noEmit` clean.

## Question

Two related asks from the scripter:

1. **Remove the schema-shape subtitle** (`entryType` — "EWP rule entry", "WEC
   data entry", etc.) from the Problems-panel tag UI. Keep emitting
   `entryType` on `Problem` objects in the backend for now; just stop
   rendering the second line (`main.ts:623-626`, `.branch-entry` in
   `style.css`).
2. **Introduce a new filterable group for YAML-native flags** — the synthetic
   branches `(parse)`, `(root)`, `(item)` that `structuralPrecheck.ts` already
   emits today but deliberately excludes from the category FILTER
   (`diagnosisCategories.ts:44-47`). The scripter wants:
   - a **new top-level category name** you propose (grill + recommend one);
   - the existing `(root)` / `(parse)` / `(item)` labels shown as a
     **sub-group** under that category in the tag UI;
   - the category FILTER menu to include this new group (alongside Structure
     problem / Value problem / etc.).

Grill toward a concrete answer:

1. **Proposed category name** — e.g. "YAML problem", "Format problem", "File
   shape problem", or something that reads clearly next to the five existing
   kind-based categories. Recommend one and say why.
2. **Tag layout** — one line (category only) vs. two lines (new category bold,
   sub-group muted) mirroring the old entryType layout but inverted.
3. **Filter behavior** — one checkbox for the whole YAML-native group, or
   separate checkboxes per sub-group `(root)` / `(parse)` / `(item)`?
4. **Copy-to-clipboard / report strings** — `main.ts:652` currently joins
   `branch · entryType`; update convention for the new shape.
5. **Invalid file / Legacy but working** — confirm those stay untouched.

Prototype in `/prototype` if the tag layout is ambiguous. Once resolved,
implement directly: update `diagnosisCategories.ts`, every `(parse)`/`(root)/
`(item)` emission site, FILTER plumbing, tests, and live-verify.
