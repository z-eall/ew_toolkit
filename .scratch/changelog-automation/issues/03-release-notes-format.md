Type: prototype
Status: resolved

## Question

What should a generated release-notes entry actually look like? Produce a few concrete format options (e.g. flat bullet list; categorized sections like Fixed/Added/Changed; per-Tool sections given toolkit-wide scope even with only one Tool today; with/without emoji or severity tags matching the validator's own diagnosis categories) and let the user pick/react.

Use the `/prototype` skill to draft 2-3 sample release-note bodies (using a real recent batch of validator commits as source material) rather than describing formats in the abstract.

## Answer

Option C — group entries by validator diagnostic area, reusing the tool's own `DIAGNOSIS_CATEGORIES` vocabulary from [diagnosisCategories.ts](../../../ewp_validator/src/diagnosisCategories.ts) as the section headers, rather than a generic Fixed/Added/Changed split or a flat list. Chosen over Option A (flat list, no categorization) and Option B (Keep-a-Changelog style Fixed/Added/Changed) because it reads instantly to a user who already knows the validator's Problems-panel category filters, and avoids Option B's per-entry judgment call on change-type. Mockup (built from a real batch of recent validator commits, rendered as an actual GitHub Release page): [Release Notes Format](https://claude.ai/code/artifact/da338bc5-4ea4-4edf-99a8-a5514156f9f6), Option C panel.

**Category vocabulary updated 2026-08-19** (ticket [03](../../validator-round2/issues/03-changelog-nontechnical-terms.md) on the Validator Round 2 map): the section-header vocabulary is now the 5-category scheme from
[Redesign the diagnosis category grouping](../../message-catalog/issues/01-category-grouping-redesign.md) —
**Structure problem**, **Value problem**, **Reference problem**, **Invalid file**, **Legacy but working** —
not the original 10-category list (Data entry reference, Format lint, Value group, Legacy format, etc.),
which is stale as of the diagnosis-category redesign.

**Superseded in part by [Retroactive reformat and release 3](05-retroactive-reformat-and-release-3.md) (2026-08-20):** published releases stay unedited; going-forward headers are **Site first**, then six FILTER names including **YAML problem**.

Known scaling gap (already tracked, not resolved here): this format doesn't obviously extend to a future Tool #2 with its own unrelated diagnostic vocabulary — see the map's "Not yet specified" item on per-Tool attribution. When Tool #2 exists, this ticket's format likely nests under a per-Tool split rather than being replaced outright.

**Drafting convention (added 2026-08-19):** `scripts/cut-release.mjs` itself doesn't filter or reword anything — it only tags and publishes a notes file someone has already drafted from `git log`/diff. Before that notes file is handed to the script, whoever drafts it applies two edits by hand: (1) reword any section header or entry text that still uses old/technical category or internal-check names to the current 5-category vocabulary above, and (2) prune entries against the hub-wide message-quality checklist's spirit — drop anything that doesn't tell a scripter something they'd care about (pure internal refactors, test-only changes, wording tweaks with no behavior change). No local draft notes file existed as of this ticket's resolution — the two already-published releases (`v2026-08-18`, `v2026-08-18-2`) use the old 10-category headers and weren't retroactively edited (editing a published GitHub Release is a public-content change outside this ticket's local-docs scope); this convention governs notes drafted from here forward.
