# Auto mode: stop validating on every keystroke

Type: grilling
Status: resolved (2026-08-20)
Blocked by: (none)
Parent: [Validator Round 3 map](../map.md)

## Answer

Grilling settled on **hybrid (4)**:

- **400ms fast pass:** `revalidateFileStructural()` — filename gate +
  structural precheck for the edited file only; drops that file's reference
  findings until the full pass.
- **1200ms idle full pass:** existing `revalidateAll()` (all files +
  `runReferenceValidation()`).
- **Immediate full pass:** add/remove/upload/rename (`revalidateOrDefer`),
  `setActive` when the active file id changes, Manual→Auto with stale batch,
  `validateNow()`.
- **Stale reference window:** acceptable without a new Auto-mode indicator.

Implementation: `scheduleHybridRevalidation()`, `cancelScheduledValidation()`,
`scanFileStructural()` shared by per-file and full passes.

Tests: 4 cases in `fileManager.test.ts` (fake timers). `vitest run` +
`tsc --noEmit` clean.

## Question

Auto mode currently schedules a full-project `revalidateAll()` on every
content change, debounced 200ms (`fileManager.ts:273-292`,
`scheduleRevalidateAll`, `VALIDATE_DEBOUNCE_MS`). On large batches this causes
noticeable lag. The scripter explicitly reopened this topic (it was Out of
scope on the UI/UX Functionality Fixes map).

Grill toward a concrete strategy — recommend one primary approach:

1. **Longer debounce** — e.g. 500ms–1500ms idle before a pass. Simple, but
   still runs whole-project on every pause.
2. **Idle / "typing stopped" gate** — only validate after N ms with no
   keystrokes (distinct from debounce if combined with a max-wait cap).
3. **Per-file scope** — revalidate only the edited file on keystroke, full
   project on upload/remove/switch-to-auto. Fixes lag but reference checks
   cross files (data.yaml definitions, custom keys) — assess correctness
   impact.
4. **Hybrid** — per-file structural pass on debounced keystroke, deferred
   full-project reference pass on longer idle or on blur/tab-switch.
5. **Explicit "live check off" sub-mode** — probably too heavy; mention only
   if nothing else fits.

For each option: lag improvement, correctness risk (especially reference
validation), and complexity. Pick one default the scripter can react to.

Once resolved, implement in `fileManager.ts` + tests; live-verify on a
medium batch with rapid typing — Problems panel should update without
freezing the editor.
