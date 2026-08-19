# Validator Round 2 — Reliability & UX Fixes — Map

Label: wayfinder:map

## Destination

A second batch of scripter-reported `ewp_validator` issues is resolved:
in-app filename edits are checked against a valid EWP structural filename
before they're allowed to complete; "Export all" is optimized (or confirmed
already sufficient) against real-world large-batch resource concerns;
release notes use the same non-technical category vocabulary as the
diagnosis-category redesign and skip low-value entries; both FILTER menus
gain a select-all/deselect-all toggle; diagnosis messages hint at an
existing UI button when one directly fixes the problem, as a durable
standing rule; upload intake is reworked (or deliberately left as-is, if
the feasibility check doesn't justify a change) so invalid files are less
likely to sit around unnoticed; and the Custom saved key validation is
rebuilt against the actual EWP/WEC C# source instead of accumulated manual
guesses.

Reaching the destination means: every item above is either implemented and
live-verified, or — where grilling concludes no change is warranted — that
conclusion is recorded with its reasoning, same bar as any other map here.

## Notes

- Domain: `ewp_validator`'s UI/interaction layer and its Reference-problem
  validation logic. Sibling to
  [UI/UX Functionality Fixes](../ui-functionality-fixes/map.md),
  [Editable Message & Category Catalog](../message-catalog/map.md),
  [Validator UI Polish](../validator-ui-polish/map.md), and
  [Changelog Automation](../changelog-automation/map.md) — this map cross-
  references all four rather than duplicating their scope.
- **This batch was charted mid-way through a live session** (2026-08-19),
  alongside the still-open
  [Review and fix Manual mode's automation gates](../ui-functionality-fixes/issues/05-manual-mode-automation-gating.md)
  ticket on the UI/UX Functionality Fixes map — that ticket is NOT
  duplicated here; it stays on its original map but is worked as part of
  the same grilling pass as this map's tickets, since the scripter asked
  for both batches handled together.
- Standing preferences inherited from the parent
  [EW Toolkit map](../ew_toolkit/map.md): hub-wide message-quality
  checklist, two-step source-verify-then-duplication-check rule (critical
  for [Custom saved key validation rework](issues/07-custom-key-validation-rework.md)),
  $0/no-backend, low-maintenance.
- This map's tickets **carry execution** for the `task`-typed tickets
  (matching this repo's established convention); the `grilling`-typed
  tickets resolve the decision here and implement in the same pass unless
  the scope turns out too large for one session, in which case the
  resolution comment says so explicitly and a follow-on task ticket is
  spun off.
- Skills: `/grilling` + `/domain-modeling` for every grilling ticket;
  `/research` sub-agents for the AFK source-verification legs of
  [Custom saved key validation rework](issues/07-custom-key-validation-rework.md)
  and the code-survey leg of
  [Optimize "Export all"](issues/02-export-all-optimization.md) — dispatch
  before asking the scripter to weigh in, never guess at what the code or
  source does.

## Decisions so far

- [Standing rule: diagnosis messages hint at the UI action that fixes them](issues/05-diagnosis-message-ui-hints.md) — Per-message, not per-category (real "Clear invalid files"/rename-via-filename inventory found "Legacy but working" mixes UI-fixable and non-fixable messages). Hint appends to message text, no new inline UI element. Added as item 7 of the hub-wide message-quality checklist. Implemented for both current UI-fixable cases (Invalid file → trash icon; legacy filename → click-to-rename) in `fileNameCheck.ts`.
- [Apply non-technical category wording to release notes; prune low-value entries](issues/03-changelog-nontechnical-terms.md) — Doc-only: [changelog-automation ticket 03](../changelog-automation/issues/03-release-notes-format.md) and its map now record the 5-category vocabulary (Structure problem / Value problem / Reference problem / Invalid file / Legacy but working) as the release-notes section-header convention, plus a drafting-convention note covering both rewording and low-value pruning for future `cut-release.mjs` notes. No local draft notes existed to reword; the two already-published GitHub Releases keep their old 10-category headers (editing a published Release is out of this ticket's local-docs scope).
- [Add select-all/unselect-all toggle under both FILTER menus](issues/04-filter-select-all-toggle.md) — Added a shared `toggleAllSelection` pure helper (fileView.ts) and a "Select all"/"Deselect all" button under both the file-panel FILTER and Problems-panel category FILTER checkbox lists in `main.ts`, writing into the same `sidebarFilters`/`categoryFilter` Sets the individual checkboxes already drive. Unit-tested in fileView.test.ts; live-verified in browser preview.
- [Review and fix Manual mode's automation gates](../ui-functionality-fixes/issues/05-manual-mode-automation-gating.md) — Cross-referenced ticket on the UI/UX Functionality Fixes map, worked as part of this same grilling pass. Manual mode now means zero automatic revalidation, full stop — keystroke edits and re-uploads of already-loaded files both mark the batch stale instead of auto-validating. Live-verified; 3 new regression tests. Full detail on the linked map.
- [Optimize "Export all"](issues/02-export-all-optimization.md) — Code-survey found the freeze bug already fixed but a real main-thread-blocking risk at the scripter's actual scale (2000+ files, multi-folder); moved `buildZip` into a Web Worker with live progress in the existing banner, kept single-zip-with-folder-structure shape (folder-by-folder split was not wanted). Live-verified: worker confirmed loaded/used via network panel, "Exported 65 files" reached with no new errors.
- [Rework "Custom saved key" validation](issues/07-custom-key-validation-rework.md) — Source-verified against EWP's actual `DataStorage.cs`/`Functions.cs` (no "WEC" sibling exists for this feature). Fixed three real bugs: `save`/`save++`/`save--` write-key extraction was splitting on the wrong point (or splitting when it shouldn't), matching was case-sensitive when EWP's storage is case-insensitive, and EWP's documented `*` bulk-match wildcard wasn't modeled at all. Severity and the flat-namespace assumption were already correct — no change needed there. Live-verified in browser preview with both a literal-underscore key and a case-mismatched key.
- [Fix the "data" filename rule](issues/08-data-filename-folder-rule.md) — EWP's real data-file rule is folder-based, but this validator's `folder` field is a UI-only export-organization label with no tie to the scripter's real EWP install path, so a folder-based gate isn't buildable here at all. Kept the existing `"data"` filename prefix as a deliberate, documented practical heuristic instead (scripters conventionally don't name data files anything else), not a source-verified rule — commented as such in `fileNameCheck.ts`. No logic change; unblocks [Rework upload logic](issues/06-upload-logic-block-invalid.md)'s deferred blocking-approach decision.
- [Rework upload logic: block invalid file types at intake vs. reactive clear](issues/06-upload-logic-block-invalid.md) — Extension gate (`.yaml`-only) tightened to a silent hard filter at intake, matching EWP's real source rule exactly. Filename-prefix gate ("Invalid file") became warn-and-skip instead of a hard block: `ingest()` now confirms with the scripter immediately at upload time, listing filename-detectable invalid files with an "Add anyway?" choice — Cancel skips just those and loads the rest, OK loads everything. Chosen over a hard block because the underlying `"data"` prefix rule (ticket 08) is a documented heuristic, not a guaranteed-correct rule — a silent reject could drop a legitimate file with no recourse. Live-verified in browser preview (skip path and add-anyway path both confirmed).
- [Validate filename against EWP structure on rename/edit](issues/01-filename-edit-validation.md) — Reversed the initial hard-block answer to match ticket 06's soft philosophy: rename always commits, never blocked, since the underlying rule is the same known-imperfect heuristic as ticket 08. Added a mode-independent, non-blocking rename-time note instead — filename text recolors and a popover shows the exact `checkFileName` message, staying up until the scripter moves the mouse, clicks, or types (no auto-dismiss timer), settled via a `/prototype` round (3 variants driven live in-browser). Found and fixed two real bugs along the way: `fileManager.renameFile` never re-validated at all (unlike every other mutator), leaving the Problems panel stale after a rename; and the popover's dismiss listeners were bubble-phase, so a click into the Monaco editor never reached them (fixed to capture-phase). Live-verified: invalid and legacy renames both confirmed, editor-click dismissal confirmed.
- [Custom confirmation modal component: replace window.confirm() hub-wide](issues/09-custom-confirm-modal.md) — Built one reusable `showConfirmModal()` helper (`ewp_validator/src/confirmModal.ts`, kept local to the validator — no other Tool has a confirm dialog yet), replacing all 5 native `confirm()` sites in `main.ts`. Upload-gate became a real 3-way (Skip these files / Proceed anyway / Cancel upload — the cancel option is new, previously impossible at that step); the other 4 keep 2-way but now have real labels. Destructive confirms get no Enter-key default (Escape-only) and a `--error`-accented danger button; Cancel/safe is primary everywhere except upload-gate. Added message-quality checklist item 9 (primary-button choice must be stated per use case) to `ew_toolkit/map.md`. Correction to the handoff's audit: `beforeunload` (unsaved-changes exit warning) is a 6th native dialog it missed, but it's correctly out of scope — browsers don't allow replacing that dialog with custom UI, and it already covers page refresh (nothing new needed there). Live-verified in browser preview across 3 of the 5 sites (button roles/focus, Enter/Escape behavior, and end-to-end clear).

## Not yet specified

(none — the one item here, whether a rebuilt Custom saved key check surfaces
new category needs, resolved to "no" once the source-verification research
landed: severity stays `info` throughout, per EWP's own silent handling of
orphaned keys.)

## Out of scope

(none yet)
