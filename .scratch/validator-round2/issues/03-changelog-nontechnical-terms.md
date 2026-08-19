# Apply non-technical category wording to release notes; prune low-value entries

Type: task
Status: resolved
Blocked by: (none)

## Question

Not a real decision — the naming standard already exists
([Redesign the diagnosis category grouping](../message-catalog/issues/01-category-grouping-redesign.md):
Structure problem / Value problem / Reference problem / Invalid file /
Legacy but working) and the release-notes format was already decided in the
[Changelog Automation map](../changelog-automation/map.md)
([What should a generated release-notes entry look like?](../changelog-automation/issues/03-release-notes-format.md) —
sections grouped by the validator's diagnostic-category vocabulary). That
ticket's grouping vocabulary is now stale — it names the *old* 10-category
scheme ("Data entry reference", "Format lint", "Value group", etc.), not the
new 5.

This ticket is the mechanical follow-through: apply the new category names
consistently wherever release notes reference diagnosis categories, and — as
the scripter asked — prune changelog entries that carry minimal influence or
aren't useful for a scripter to be informed about (e.g. pure internal
refactors, test-only changes, wording tweaks with no behavior change).
"Prune" is a light editorial judgment call the implementer makes directly
per the hub-wide message-quality checklist
([EW Toolkit map](../../ew_toolkit/map.md) Notes) — not something to grill,
since the bar (does this tell a scripter something they'd care about?) is
already established.

Covers:

1. Update [What should a generated release-notes entry look like?](../changelog-automation/issues/03-release-notes-format.md)'s
   recorded convention to reference the 5 new category names instead of the
   old 10.
2. Re-read past/draft release notes (if any exist locally, e.g. staged for
   the next release) and reword any technical category references.
3. Apply the same prune-low-value-entries judgment going forward as part of
   how `scripts/cut-release.mjs`-drafted notes get edited before publishing
   (this is a drafting-convention note, not a code change — the script
   itself doesn't auto-filter).

## Answer

All three covers are doc-only, no code change (`scripts/cut-release.mjs` doesn't
generate or filter text itself — it only tags/publishes a notes file someone
already drafted):

1. [What should a generated release-notes entry look like?](../../changelog-automation/issues/03-release-notes-format.md)
   now records the 5-category vocabulary (Structure problem / Value problem /
   Reference problem / Invalid file / Legacy but working) as the section-header
   convention, replacing the stale 10-category list. The
   [Changelog Automation map](../../changelog-automation/map.md)'s decision
   entry was updated to match.
2. No local draft/staged release notes exist to reword — the only release
   notes that exist are the two already-published GitHub Releases
   (`v2026-08-18`, `v2026-08-18-2`), which still use the old 10-category
   headers (Data entry reference, Format lint, Value group, Legacy format,
   Custom saved key). Editing a published GitHub Release is a public-content
   change outside this ticket's local-docs scope, so they were left as-is;
   this convention governs notes drafted from here forward, and if the two
   old releases are ever revisited that's a separate explicit ask.
3. A drafting-convention note was added to
   [03-release-notes-format.md](../../changelog-automation/issues/03-release-notes-format.md)
   spelling out both the reword-to-new-vocabulary step and the prune-low-value
   step as manual edits applied to a notes file before it's handed to
   `cut-release.mjs`.
