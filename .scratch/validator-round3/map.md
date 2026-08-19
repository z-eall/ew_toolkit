# Validator Round 3 — Manual Mode, Tags & Validation Accuracy — Map

Label: wayfinder:map

## Destination

A third batch of scripter-reported `ewp_validator` issues is resolved:
Manual mode hides per-file validation badges until an explicit Validate pass
(and hides them again whenever the batch goes stale or any file mutates);
pressing Validate also triggers a one-time errors-first file-panel sort;
FILTER select/deselect toggles stay open like the individual checkboxes;
diagnosis tags drop the schema-shape subtitle in favor of a new YAML-native
flag category with `(root)` / `(parse)` / `(item)` as sub-groups included in
the category FILTER; Auto mode stops running a full-project pass on every
keystroke; totally empty files get a soft warning instead of a hard YAML-list
error; filename rename produces live Problems-panel diagnoses in both Auto
and Manual modes (including after pressing Validate); and RPC / name / data /
poke validation rules are corrected against EWP/WEC source behavior.

Reaching the destination means: every item above is either implemented and
live-verified, or — where grilling or research concludes no change is
warranted — that conclusion is recorded with its reasoning.

## Notes

- Domain: `ewp_validator` UI (`main.ts`, `style.css`, `fileView.ts`) and
  validation logic (`fileManager.ts`, `structuralPrecheck.ts`,
  `rpcValidation.ts`, `fileNameCheck.ts`, `formatLint.ts`,
  `referenceValidation.ts`, `diagnosisCategories.ts`). Sibling to
  [Validator Round 2](../validator-round2/map.md),
  [Validator UI Polish](../validator-ui-polish/map.md),
  [UI/UX Functionality Fixes](../ui-functionality-fixes/map.md), and
  [Message Catalog](../message-catalog/map.md) — cross-reference rather than
  duplicate.
- **Manual mode badge bug (grounded at chart time):** `toViewFile` rolls up
  status from `file.problems` via `statusOf()` (`fileView.ts:21-24`,
  `main.ts:365-366`). In Manual mode upload/add defers validation
  (`revalidateOrDefer`, `fileManager.ts:121-127`) leaving `problems: []`, so
  every file shows a green ✓ before Validate — misleading. Batch staleness
  already exists (`validationStatus: "none" | "clean" | "stale"`,
  `fileManager.ts:50-51`; yellow dot on Validate button,
  `main.ts:360`) but file-row badges ignore it.
- **YAML-native sub-groups (ticket 04):** `(parse)`, `(root)`, `(item)` are
  stored as `entryType` under `YAML problem` (`diagnosisCategories.ts`);
  shown as a muted second tag line only for that category
  (`shouldShowTagSubline`). Schema-shape `entryType` values (EWP rule entry,
  …) still emit on `Problem` but no longer render in the tag UI.
- **Order-freeze interaction:** file-panel row order freezes between
  upload-complete and explicit sort-menu picks per
  [Order-freeze scope](../validator-ui-polish/issues/03-order-freeze-scope.md).
  Manual Validate's one-time errors-first sort must be reconciled with that
  standing rule — see ticket 02.
- **Auto-mode lag:** explicitly deferred on
  [UI/UX Functionality Fixes map](../ui-functionality-fixes/map.md) Out of
  scope — this batch **reopens** it at the scripter's request (ticket 05).
- Standing preferences from [EW Toolkit map](../ew_toolkit/map.md): hub-wide
  message-quality checklist, two-step source-verify-then-duplication-check
  rule (critical for tickets 08–11 and their follow-on implementation
  tickets).
- This map's tickets **carry execution** for `task`-typed tickets and for
  `grilling`-typed tickets once the decision is settled — matching Round 2's
  convention. `research` tickets resolve via `/research` sub-agents first;
  blocked implementation tickets wait on those findings.
- Skills: `/grilling` + `/domain-modeling` for every grilling ticket;
  `/research` sub-agents for tickets 08–11.

## Decisions so far

- [Cross-check WEC data entry `name` field validation](issues/09-wec-name-field-validation-accuracy.md) — `- name: 333` is a false positive; accept via `numberOrString` on `wecDataEntry.name`, plus reference-validation normalize-to-string in ticket 13.
- [Cross-check poke parameter naming acceptance rules](issues/11-poke-parameter-naming-rules.md) — do not error on `:`/`;` in poke params (valid one-token literals); optional info/warning in ticket 13, or no change if scope is tight.
- [Hide file status badges in Manual mode until Validate](issues/01-manual-mode-status-badge-hiding.md) — `shouldShowFileStatusBadges()` hides sidebar ✓/counts in Manual until batch status is `"clean"`; re-hides on `"none"`/`"stale"`.
- [Manual Validate triggers a one-time errors-first sort](issues/02-manual-validate-errors-first-sort.md) — third order-freeze trigger; after Validate completes from `"none"`/`"stale"`, sets `currentSort = "errors"` and recomputes `fileOrder`; repeat Validate on an already-clean batch does not resort.
- [FILTER select/deselect toggles keep the menu open](issues/03-filter-toggle-keep-menu-open.md) — `e.stopPropagation()` on both toggle-all button handlers so menu re-render doesn't detach the click target before the document close listener runs.
- [Redesign diagnosis tags: drop schema-shape subtitle, add YAML-native group](issues/04-diagnosis-tag-yaml-native-grouping.md) — `YAML problem` category (filterable); schema `entryType` hidden in tag UI; variant B two-line tag for `(parse)`/`(root)`/`(item)` sub-groups only; `formatProblemTag()` for copy/report.
- [Auto mode: stop validating on every keystroke](issues/05-auto-mode-live-edit-strategy.md) — hybrid schedule: 400ms per-file structural pass on keystroke, 1200ms idle + file-switch triggers full `revalidateAll()` including references.
- [Empty files get a soft warning, not a hard YAML-list error](issues/06-empty-file-soft-warning.md) — `hasNoActiveContent()` unifies empty/whitespace-only and comment-only into one warning with scripter message; `YAML problem` / `(root)`.
- [Filename rename must produce live Problems-panel diagnosis](issues/07-filename-rename-live-diagnosis.md) — filename gate exempt only for ephemeral `unnamed.yaml` drafts; rename away from placeholder runs `checkFileName` in Auto immediately and on Manual Validate.
- [Cross-check RPC validation against EWP source](issues/08-rpc-validation-source-audit.md) — tables complete vs `docs/RPCs.md`; `RPC_SetVisualItem` repro valid; ticket 12 should generate tables from docs, add type aliases (`name`≡`string`, int↔enum), optional missing-param warnings; warning-only severity unchanged.
- [Cross-check EWP rule entry `data` field validation](issues/10-ewp-data-field-validation-accuracy.md) — not a false positive; `data:` is scalar-only in EWP; keep `data: str`; typed lists use `filters:`/`bannedFilters:`; correct repro is `data: int, isCustom, 1`.
- [Correct name / data / poke entry field validation rules](issues/13-entry-field-validation-corrections.md) — consolidated `dataFieldValidation.ts`; WEC `name` accepts numeric; clearer scalar-field type errors for list-on-`data`/`filter`; poke `:`/`;` unchanged.
- [Diagnosis arbitration — shape-mismatch catalog](../diagnosis-arbitration/issues/01-shape-mismatch-catalog-foundation.md) — `shapeMismatchDiagnosis.ts` intent messages for typed-line-on-`data:` etc.; ajv suppressed on claimed paths; [map](../diagnosis-arbitration/map.md) owns future rows (RPC ticket 12).
- [Rework RPC validation logic](issues/12-rpc-validation-rework.md) — type aliases (`name`/`string`, `int`/`enum_*`), case-sensitive prefix warnings, missing-param hints; hand tables retained; doc generation deferred.
- [Drop JSON-Schema "/" path prefix from value error messages](issues/14-drop-ajv-json-pointer-prefix.md) — `fieldLabelFromInstancePath()` + `formatAjvFallthroughMessage()` in `structuralPrecheck.ts`; ajv fallthroughs use `` `field:` `` wording, nested `` `data:` under `objects:` ``; tests added.

## Not yet specified

- Whether corrected name/data/poke rules need new message-catalog entries —
  depends on research outcomes; message wording can land in code first per
  Round 2 precedent unless the hub checklist says otherwise.
- RPC param table generation — charted on
  [Validation Maintenance map](../validation-maintenance/map.md).

## Out of scope

- **Message catalog YAML migration** — separate
  [Message Catalog map](../message-catalog/map.md); this batch may add or
  tweak user-facing strings in code directly, same as Round 2.
- **Per-file-scoped revalidation as a standalone perf project** — only in
  scope if ticket 05's Auto-mode strategy explicitly chooses it; otherwise
  stays a future ticket.
