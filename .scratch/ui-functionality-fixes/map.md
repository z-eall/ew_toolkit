# UI/UX Functionality Fixes — Map

## Destination

Five reported UX/functionality issues in `ewp_validator` are resolved: the
per-panel toolbar buttons (New/Save, diagnosis filter, report-a-bug) sit
before their panel's first content item instead of after it; the Save
button is relabeled "Export" with an appropriate icon; the "Save all"
freeze bug is fixed and actually exports; the sidebar and editor section
headers share one consistent height; and Manual mode's automation gates are
reviewed with the scripter and made to match what Manual mode is supposed
to mean — no revalidation happens behind the scripter's back.

Reaching the destination means: every button described above sits where
requested with a visible gap; "Save" reads "Export"; clicking "Save all"
(soon "Export all") on a real multi-file batch downloads a working zip
without freezing the tab; the LOADED FILES and editor filename headers are
visually the same height; and the scripter has confirmed, file by file,
which validation triggers should and shouldn't fire while Manual mode is on.

## Notes

- Domain: `ewp_validator`'s UI layer (`main.ts`, `style.css`, `fileManager.ts`,
  `zip.ts`, `fileView.ts`). Sibling sub-effort to the
  [EW Toolkit map](../ew_toolkit/map.md), independent of the
  [Editable Message & Category Catalog map](../message-catalog/map.md) —
  different surface (interaction/layout/perf, not diagnosis text).
- A grounded code survey was done while charting this map (button DOM
  locations + governing flex CSS, the full `doSave("all")` call chain, the
  two header's CSS, and every validation-trigger call site with which
  mode(s) it respects) — cited with file:line in each ticket below rather
  than re-investigated per ticket.
- This map's tickets **carry execution**, matching this repo's established
  convention (Schema Source Audit map, ticket 13's rounds, the Round 10
  message-quality work) — a ticket here resolves *and implements*, except
  the one grilling ticket (Manual-mode gating), which is a real HITL
  decision the scripter asked to review personally.
- Every fix here still has to clear the hub-wide **message-quality
  checklist** and **duplicate/clash standing rule** in the
  [EW Toolkit map](../ew_toolkit/map.md)'s Notes where relevant (e.g. any
  new user-facing text from the Export rename or a "still validating"
  state).
- Skills: `/grilling` for the Manual-mode-gating ticket; no research tickets
  needed — everything here is local-codebase work, not third-party/external
  knowledge.

## Decisions so far

- [Move panel toolbar buttons before their panel's first content item](issues/01-toolbar-button-placement.md) — New/Export now render before the filename, and the diagnosis filter/report buttons now render before the Errors/Warnings/Info tabs, each set off by a divider + gap. Live-verified.
- [Rename Save to Export with an appropriate icon](issues/02-save-to-export-rename.md) — Resolved together with the ticket above (same button). Tooltip, aria-label, and all three dropdown options reworded to "Export"; floppy-disk icon replaced with a standard export (arrow-out-of-tray) glyph. Live-verified.
- [Fix the "Save all" freeze bug](issues/03-save-all-freeze-bug.md) — Root cause was `zip.ts` building the archive via unbounded `push(...bytes)` argument-spreads; rewritten to write directly into one pre-sized `Uint8Array` via `DataView`, O(n) with no spread. Added a "Building export…" progress banner + yield (mirrors the existing validation-banner pattern) per the hub-wide UX standing rule. Regression tests added (large-batch build, offset integrity); live-verified for the normal-size case, large-batch freeze fix proven by the new stress test rather than a scripted repro.
- [Standardize section header height across the hub site](issues/04-standardize-header-heights.md) — New shared `.panel-header` class (4px vertical padding, the shorter of the two) applied to the sidebar and editor-filename headers; no other hub-shell header exists yet to converge. Live-verified all three panel headers now measure exactly 33px.
- [Review and fix Manual mode's automation gates](issues/05-manual-mode-automation-gating.md) — Manual mode now means zero automatic revalidation, full stop: keystroke edits and re-uploads of already-loaded files both mark the batch stale instead of auto-validating (they shared one code path, one fix covered both). Per-file-scoped revalidation (vs. whole-project) stays a separate future perf question. Live-verified; 3 new regression tests in `fileManager.test.ts`.

## Not yet specified

- Whether the Auto-mode per-keystroke revalidation lag (the scripter
  explicitly flagged this as "worth exploring" but *not* something to fix
  now) becomes its own future ticket/map — deliberately left unspecified;
  see Out of scope.
- Whether whole-project-scope revalidation (vs. per-touched-file) becomes its
  own future perf ticket — surfaced again while resolving Manual-mode gating,
  deliberately deferred there for the same reason as the item above.

## Out of scope

- **Optimizing Auto mode's per-keystroke/debounced revalidation
  performance.** The scripter explicitly separated this from the Manual-mode
  gating fix — flagged as a real opportunity worth exploring later, not part
  of reaching this map's destination. Revisit as its own effort if raised
  again.
