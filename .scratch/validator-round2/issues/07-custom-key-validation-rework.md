# Rework "Custom saved key" validation — reduce false positives/negatives

Type: grilling
Status: resolved
Blocked by: (none)

## Question

The scripter reports the Custom saved key validation (now folded into
**Reference problem**, see
[Redesign the diagnosis category grouping](../message-catalog/issues/01-category-grouping-redesign.md))
is unreliable — it's been patched with many manually-provided allowances for
loose/edge-case situations, yet still produces both false-positive errors
and false-negative passes. The scripter's own diagnosis: this validation
was built without proactively checking the EWP/WEC source C# first (unlike
the two-step source-verify-then-duplication-check standing rule adopted
later this session — see [EW Toolkit map](../../ew_toolkit/map.md) Notes),
so it's been reverse-engineered from observed behavior/guesses rather than
the actual rules the mod enforces.

This is the largest and most technically-grounded ticket in this batch —
treat it as needing real source verification before any redesign
discussion, per the standing rule.

Grill toward a concrete answer, in this order:

1. **Source-verify first (dispatch as research, AFK):** find and read the
   actual C# logic in Jere Kuusela's EWP/WEC source
   (`https://github.com/JereKuusela/valheim-expand_world_prefabs` and
   its WEC sibling) that defines what makes a custom saved key
   valid/invalid — likely wherever custom key strings are registered,
   looked up, or compared. State concretely: what are the real rules
   (naming pattern? scope/namespace rules? case sensitivity — the project
   already has precedent research on this, see
   `.scratch/ew_toolkit/research/13-round8-type-case-sensitivity.md`,
   confirm whether custom keys follow the same case-insensitive pattern or
   not)? Cite file/line.
2. **Then audit current code against that ground truth:** read the current
   custom-key validation logic (wherever it now lives after the Reference
   problem merge — check `fileManager.ts`'s `REFERENCE_BRANCH_LABEL`
   handling and whatever feeds it) and the scripter's manually-added
   allowances. For each allowance, classify it: correctly compensating for
   a real permissive C# rule, a workaround for a validator bug/gap, or a
   guess that may itself be wrong now that the real rule is known.
3. **Grill the rework itself** once 1 and 2 give real findings — likely
   shape: replace the accumulated manual allowances with logic that
   directly encodes the verified C# rule, removing guesswork. Bring
   concrete before/after behavior for the scripter to confirm rather than
   an abstract proposal.
4. Check for duplication/clash against the Reference-problem-adjacent
   "unused data entry" check it was merged with (per the same standing
   rule) — a rewritten custom-key check shouldn't reintroduce the kind of
   double-diagnosis bug fixed earlier this session for the `type:` field.

## Answer

**Source-verification (AFK leg, full detail in
[research/07-custom-key-source-verification.md](../research/07-custom-key-source-verification.md)):**
fetched and read EWP's actual `DataStorage.cs`, `Functions.cs`, and `Parse.cs`
in full (`main` branch, 2026-08-19). Confirmed there is no "WEC" sibling —
`valheim-expand_world_data` has no equivalent storage; this feature is
EWP-only. Key findings:

1. Storage is one flat, global `static Dictionary<string,string>` — no
   per-object/per-file scoping, confirming the validator's existing
   flat-namespace assumption was already correct.
2. **Write-key extraction was wrong for `save`/`save++`/`save--`.** Real EWP:
   `save++`/`save--`/`load`/`clear` use their entire remainder as the key,
   unsplit (`_` is literal); only plain `save` splits its remainder, and only
   on the **first** `_` (not the last, as the old code assumed). Dynamic
   `<...>` parameters are resolved by EWP itself, inside-out, *before* this
   split happens.
3. **Case-insensitive** — every `DataStorage` call site lowercases before
   touching the dict, so `Foo`/`foo`/`FOO` are the same key at runtime.
4. **No character/length/prefix constraints**, except `*` outside a `<...>`
   group is a documented reserved bulk-match wildcard, never a literal
   character — a gap the validator didn't model at all.
5. **Orphaned reads/writes are fully silent in EWP** (no log/warn/error
   anywhere in `DataStorage.cs`) — confirms the validator's existing "info"
   severity was already correctly calibrated; no severity change needed.

**Audit against ground truth:** none of the current `keysCompatible`/
`scanKeyOccurrences` logic was a deliberate "manual allowance" that turned
out permissive by luck — every existing test case happened to have exactly
one `_`, where the old (wrong) "everything but the last segment" formula and
the correct "first segment only" formula coincide, which is why the bugs
went undetected by the existing suite despite being real.

**Rework, confirmed with the scripter** (all three fixes, no scope-down):
- [referenceValidation.ts](../../../ewp_validator/src/referenceValidation.ts):
  `scanKeyOccurrences`'s write-key extraction now splits `save` on the first
  top-level `_` only, and takes `save++`/`save--`'s entire remainder unsplit
  (previously all three were treated identically).
  `keyToPattern`/`keysCompatible` are now case-insensitive (`i` regex flag,
  case-insensitive exact-match check). A literal `*` outside a `<...>` group
  is now modeled as a wildcard in both `keyToPattern` and `keyToSubject`,
  matching EWP's own bulk-match semantics; `hasLiteral` updated so a
  purely-`*`/purely-dynamic key still can't drive a match against unrelated
  keys. Added a code comment (recommendation #6) noting the static-analysis
  limit where a dynamic `<...>` group straddles the real key/value split
  point — inherent to source-text scanning, not a bug.
- Added 4 new tests in `referenceValidation.test.ts` covering each fixed
  bug (`save++` with literal underscores, `save`'s first-vs-last split,
  case-insensitive match, `*` wildcard) — all pass, plus all 186 pre-existing
  tests still pass unmodified (they only ever exercised the coincidental
  single-`_` case).

**Duplication/clash check (step 4):** no clash found. `kind: "custom-key"`
stays a distinct branch from `kind: "data-reference"`/`"legacy-object-data"`
throughout; the existing "does not cross-report between the data.yaml
namespace and the custom-key namespace" test still passes unmodified, and
none of the three fixes touch the data.yaml reference-checking code path at
all — they're scoped entirely to the custom-key write/read matching logic.

`npx vitest run` (190/190 passed), `npx tsc --noEmit` (clean), and
`npm run build` (succeeded) all pass. Live-verified in the browser preview:
loaded `<save++_boss_kill_count>` (a literal-underscore key that would have
been wrongly split before this fix) against `keys: boss_kill_count` — 0
errors/warnings/info; loaded `<save_CaptureCity_1>` against
`keys: captureCity` (case-insensitive match) — 0 errors/warnings/info across
all 4 loaded files.
