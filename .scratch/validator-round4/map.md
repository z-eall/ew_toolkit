# Validator Round 4 — Font/Spacing Polish & New Validation Gaps — Map

Label: wayfinder:map

## Destination

A fourth batch of scripter-reported `ewp_validator` issues is resolved:
every interactive control (buttons, menu items, not just `<label>`-based
ones) renders in the hub's standard font instead of silently falling back
to the browser's UA default; the upload-gate / large-file-list confirm
modal's dashed file-list box no longer sits flush against its button row;
the RPC entry's `triggerRules:`/`remove:`-style misplaced keys get a
diagnosis that actually explains the real problem instead of a misleading
"must be a string" message a scripter can "fix" by quoting a value that
still silently does nothing at runtime; duplicate `name:` (WEC data entry)
definitions within the loaded batch are flagged; a `poke[].parameter`/`pars`
declaration with no matching `type: poke, X` trigger anywhere in the batch
is flagged as stray, and a `type: poke, X` trigger with no matching
declared parameter gets a likely-typo suggestion when a close one exists;
and EWP's string-template functions (`<save_X>`, `<load_X>`, `<string_X>`,
etc.) are checked against the real known function set so a misspelled name
(e.g. `<strink_X>` for `<string_X>`) is caught instead of silently doing
nothing.

Reaching the destination means: every item above is either implemented and
live-verified, or — where grilling or research concludes no change is
warranted — that conclusion is recorded with its reasoning, same bar as
every other round map in this repo.

## Notes

- Domain: `ewp_validator` UI (`style.css`, `confirmModal.ts`) and validation
  logic (`rpcValidation.ts`, `referenceValidation.ts`, `dataFieldValidation.ts`,
  `structuralPrecheck.ts`, `schema/generate.mjs`). Sibling to
  [Validator Round 3](../validator-round3/map.md) (previous accuracy batch,
  complete), [Diagnosis Arbitration](../diagnosis-arbitration/map.md) (owns
  intent-specific message catalog + anti-duplication contract — any new
  RPC/poke/template diagnosis row this map adds must clear that contract),
  and [Validation Maintenance](../validation-maintenance/map.md) (RPC table
  *generation* — not touched here). Cross-reference rather than duplicate.
- **Grounded at chart time** (2026-08-22), each cited file:line/live-repro
  rather than guessed:
  - **Font bug**: `getComputedStyle` in the live preview shows
    `.sort-item .menu-label`, `.validate-btn`, `.menu-toggle-all`, and
    `.icon-btn` all compute to `Arial` (Windows Chrome's UA default for
    `<button>`), while `.filter-item .menu-label` (a `<label>`, which
    inherits normally) and `.mode-toggle button` (which explicitly sets
    `font: inherit` at `style.css` ~601) both correctly compute the hub's
    `-apple-system, "Segoe UI", Roboto, sans-serif` stack. Root cause: no
    global `button { font-family: inherit }` reset exists — every other
    button class relies on inheritance that browsers deliberately don't
    give form controls by default. The user's own repro ("FILTER" text
    looking different) is one instance of this; the fix is global, not
    per-menu.
  - **Upload-limit dashed-box margin bug**: `.confirm-list-scroll`
    (`style.css` ~1296-1304, the "always-boxed" file list from
    confirm-modal-large-list) has no `margin-bottom`, `.confirm-buttons`
    (~1319-1324) has no `margin-top`, and `.confirm-box` (~1264-1274) is a
    flex column with no `gap` — live-injected repro in the browser preview
    confirms the dashed box sits flush against the button row with zero
    visual separation.
  - **RPC `triggerRules:`/`remove:` bug**: `rpcEntry` (`schema/generate.mjs`
    ~127-143) lists known control keys (`name`, `target`, `chance`, `weight`,
    `delay`, `repeat`, `repeatInterval`, `repeatChance`, `overwrite`,
    `source`, `packaged`) and falls back to
    `additionalProperties: { type: "string" }` for anything else — a
    deliberate open-dictionary design (RPC entries are a true
    `Dictionary<string,string>` in C#, including numbered call args). This
    means an unrecognized key like `triggerRules`/`remove` (real fields on
    `spawnData`, not on an RPC entry — the scripter nested them in the wrong
    place) is *only* ever caught when its value isn't a string; the moment
    it's quoted, ajv silently accepts it as a harmless-looking extra
    dictionary entry, even though it still does nothing at runtime and the
    real mistake (wrong nesting) was never named. `rpcValidation.ts`'s
    `checkRpcParams()` only walks numeric keys (`/^[1-9][0-9]*$/`, line 65) —
    non-numeric unrecognized keys are entirely unchecked once they're
    string-typed. Distinct from
    [RPC orphan list-item shape diagnosis](../diagnosis-arbitration/issues/03-rpc-orphan-list-item-diagnosis.md)
    (missing-`name:`/sibling-list-item shape, already resolved) — this is a
    different shape class (an unrecognized *key* on an otherwise well-formed
    entry).
  - **Duplicate `name:` bug**: `referenceValidation.ts`'s `runReferenceValidation()`
    already builds a `definitions: Map<string, Occurrence[]>` keyed by WEC
    data-entry name with every occurrence recorded (~379, ~432-435), but the
    only later read of that map is the "unused" hint loop (~506-517) — there
    is no branch anywhere that checks `occs.length > 1` and flags a
    duplicate. The data structure already needed for this exists; the check
    on top of it does not.
  - **Poke stray/typo matching**: [Round 3 research 11](../validator-round3/research/11-poke-parameter-naming-rules.md)
    already source-verified (against `PrefabData.cs`/`InfoSelector.cs`/`Helper.cs`)
    exactly how poke arguments and `type: poke, …` trigger filters are built
    and matched at runtime: `poke[].parameter` and `pokeParameter` split on
    spaces, `poke[].pars` splits on commas, `type: poke, X Y` splits its
    comma-suffix on spaces into trigger filter tokens, and incoming args are
    matched against those tokens case-insensitively via `Helper.CheckWild`
    (exact match, `*` wildcard, or numeric `min;max` range). That research
    intentionally deferred a definition/usage *matching* feature (§6,
    "optional low-severity warning... do not implement in this ticket") —
    this map's ticket 07 is that deferred feature, not new punctuation
    scope. `referenceValidation.ts` has no poke-parameter logic today (§4c
    of that research) but already has the exact matching primitive needed
    (`keysCompatible`'s case-insensitive/wildcard "likely match" logic,
    built for custom saved keys) to reuse or adapt.
  - **Template-function typo bug**: no existing research in this repo
    source-verifies EWP's *complete* recognized function-name set
    (`docs/functions.md` / `Functions.cs` — `save`/`load`/`clear`/`string`/
    `int`/`float`/`par`/`pid`/`host`/etc.) the way round2 ticket 07 did for
    custom saved keys. Per the hub-wide source-verify-first standing rule
    ([EW Toolkit map](../ew_toolkit/map.md) Notes), this needs a research
    leg before any typo-detection logic is designed — ticket 05 below,
    blocking ticket 06.
- Standing preferences inherited from the parent
  [EW Toolkit map](../ew_toolkit/map.md): hub-wide message-quality
  checklist, two-step source-verify-then-duplication-check rule (critical
  for tickets 03, 04, 06, 07 — all touch validation-rule territory that
  overlaps existing checks), $0/no-backend, low-maintenance.
- This map's tickets **carry execution** for `task`-typed tickets and for
  `grilling`-typed tickets once the decision is settled — matching Round
  2/Round 3's convention. The one `research` ticket (05) resolves via a
  `/research` sub-agent first; its blocked follow-on (06) waits on those
  findings.
- A new RPC/poke/template diagnosis row that graduates out of tickets 03,
  06, or 07 may belong in `shapeMismatchDiagnosis.ts` per the
  [Diagnosis Arbitration map](../diagnosis-arbitration/map.md)'s
  anti-duplication contract rather than living ad-hoc in
  `rpcValidation.ts`/`referenceValidation.ts` — each of those tickets'
  grilling pass should check that contract before landing code.
- Skills: `/grilling` + `/domain-modeling` for tickets 03, 04, 06, 07;
  `/research` sub-agent for ticket 05; no grilling needed for tickets 01-02
  (root cause and fix are already fully grounded above).

## Decisions so far

- [Source-verify EWP's complete string-template function set and argument shapes](issues/05-string-template-function-source-audit.md) — ~110 recognized function names cataloged across 4 dispatch tables (`Functions.cs`'s `GetGeneralFunction`/`GetValueFunction` plus `ObjectFunctions.cs`'s object-data-context overrides, all fetched and read in full); name matching is **case-sensitive** (opposite of custom-saved-key's case-insensitive stored-content matching); an unrecognized function name passes through **literally and silently** at runtime (no log/error) unless it collides with a scripter-defined data.yaml value-group name, in which case it silently resolves to a random group value instead; "recognized function, invalid value" is mostly **not statically checkable** (silent `defaultValue` fallback, runtime-ZDO/component-state-dependent) — one real exception found: `<iter_OP_...>`/`<iter2_OP_...>`'s `OP` token is drawn from a small, fixed, source-enumerable set, a genuine static-check opportunity; real near-miss pairs found for ticket 06's typo-distance design (`randf`/`randi`/`randomfloat`/`randomint` cluster, undocumented `calcf`/`calci` aliases, `rad2deg`/`deg2rad`, the six comparison operators, bare `<par>` vs `<par_X>`). Full findings: [research/05-string-template-function-source-audit.md](research/05-string-template-function-source-audit.md). Unblocks [ticket 06](issues/06-template-function-typo-detection.md).
- [Flag duplicate `name:` (WEC data entry) definitions](issues/04-duplicate-name-entry-detection.md) — source-verified against EWP's own `DataLoading.cs` (`LoadEntry`, fetched fresh 2026-08-22): last-loaded `name:` wins (unconditional overwrite), and EWP itself logs `Log.Warning("Duplicate data entry: ...")` for this exact condition — confirming, not just guessing, the scripter's "warning" severity ask. Implemented as a new loop in `runReferenceValidation()` over the already-built `definitions` map, reusing the `"data-reference"` kind; one problem per occurrence, batch-wide. No overlap with the WEC name-typo catalog row or the numeric-name-field ticket.
- [Design and implement typo/invalid-function-name detection for EWP string templates](issues/06-template-function-typo-detection.md) — built directly on ticket 05's catalog; new `scanUnrecognizedFunctionHeads()` in `referenceValidation.ts` reuses `findGroupEnd`/`splitTopLevel`, mirrors EWP's real no-arg-then-split-arg dispatch order, flags an unrecognized `<head_...>` as `warning`/`kind: "template-function"` with a case-mismatch-vs-edit-distance-typo suggestion, and excludes batch-defined + EWP's 4 hardcoded default value-group names to cut the one real false-positive class (value-group fallback, ticket 05 §2). "Invalid value" half deliberately deferred (not statically checkable per ticket 05 §3, except a narrow `iter`/`iter2` `OP`-enum case left as a graduation candidate for a future ticket). Confirmed against the Diagnosis Arbitration map's ownership rule: this is batch-wide definition/usage matching (referenceValidation.ts's territory, same family as the custom-key orphan check), not per-entry shape confusion (shapeMismatchDiagnosis.ts's territory).
- [Detect stray (unmatched) and likely-typo `poke` parameter/trigger pairs](issues/07-poke-parameter-stray-and-typo-matching.md) — reused `keysCompatible` as the matching primitive (confirmed, not just assumed, that its `<...>`/wildcard-skeleton/case-insensitive shape matches `Helper.CheckWild`'s core), layering `CheckWild`'s comma-alternatives step on top; stray declared parameter → `info` (may legitimately be caught outside the batch), likely-typo trigger → `warning` (concrete same-batch fix, ticket 06's edit-distance helper reused). Deliberately scoped to first-token matching only (every real example is an event-name-style first arg; full positional multi-arg modeling would need runtime `<...>` resolution, out of scope). Confirmed out of `shapeMismatchDiagnosis.ts`'s scope against the Diagnosis Arbitration map's own contract; cross-reference recorded there.

## Not yet specified

(none — every item the scripter raised this round has a ticket; further fog
would only appear once a grilling/research ticket's answer reveals a new
sub-question)

## Out of scope

(none yet)
