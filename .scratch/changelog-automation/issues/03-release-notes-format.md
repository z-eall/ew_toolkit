Type: prototype
Status: resolved

## Question

What should a generated release-notes entry actually look like? Produce a few concrete format options (e.g. flat bullet list; categorized sections like Fixed/Added/Changed; per-Tool sections given toolkit-wide scope even with only one Tool today; with/without emoji or severity tags matching the validator's own diagnosis categories) and let the user pick/react.

Use the `/prototype` skill to draft 2-3 sample release-note bodies (using a real recent batch of validator commits as source material) rather than describing formats in the abstract.

## Answer

Option C — group entries by validator diagnostic area, reusing the tool's own `DIAGNOSIS_CATEGORIES` vocabulary from [diagnosisCategories.ts](../../../ewp_validator/src/diagnosisCategories.ts) (Data entry reference, Format lint, Value group, Legacy format, etc.) as the section headers, rather than a generic Fixed/Added/Changed split or a flat list. Chosen over Option A (flat list, no categorization) and Option B (Keep-a-Changelog style Fixed/Added/Changed) because it reads instantly to a user who already knows the validator's Problems-panel category filters, and avoids Option B's per-entry judgment call on change-type. Mockup (built from a real batch of recent validator commits, rendered as an actual GitHub Release page): [Release Notes Format](https://claude.ai/code/artifact/da338bc5-4ea4-4edf-99a8-a5514156f9f6), Option C panel.

Known scaling gap (already tracked, not resolved here): this format doesn't obviously extend to a future Tool #2 with its own unrelated diagnostic vocabulary — see the map's "Not yet specified" item on per-Tool attribution. When Tool #2 exists, this ticket's format likely nests under a per-Tool split rather than being replaced outright.
