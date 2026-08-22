# Detect stray (unmatched) and likely-typo `poke` parameter/trigger pairs

Type: grilling
Status: resolved
Blocked by: (none)
Parent: [Validator Round 4 map](../map.md)

## Question

Scripter's repro:

```yaml
- prefab: Player
  poke:
  - self: true
    parameter: helloWorld <pname>
  - self: true
    parameter: helloWorld2 <pname>

- prefab: Player
  type: poke, helloWorld
```

`helloWorld` has a matching receiver (`type: poke, helloWorld`);
`helloWorld2` does not — "not wrong" syntactically, but likely dead. And
separately, a near-miss should surface as a probable typo:

```yaml
- prefab: Player
  poke:
  - self: true
    parameter: helloWorld <pname>
  - self: true
    parameter: helloWorld2 <pname>

- prefab: Player
  type: poke, helloWord   # most likely typo of helloWorld
```

This is **not** the punctuation/delimiter question
[Round 3 research 11](../../validator-round3/research/11-poke-parameter-naming-rules.md)
already answered (colons/semicolons inside a poke parameter are valid
literal tokens, no error) — that research explicitly deferred *this*
definition/usage matching feature to a later ticket (§6: "optional
low-severity warning... do not implement in this ticket"). Treat that
research as already-settled ground truth for how poke arguments are
tokenized and matched at runtime; this ticket is the deferred feature, not a
re-litigation of the punctuation question.

Relevant runtime facts already source-verified (round 3 research 11, cite
before re-deriving):
- `poke[].parameter` and legacy `pokeParameter` split on **spaces**
  (`PrefabData.cs` `Poke.GetArgs`).
- `poke[].pars` splits on **commas** (`Parse.ToArr`/`Parse.Split`).
- `type: poke, X Y` splits its comma-suffix on **spaces** into trigger
  filter tokens (`PrefabData.cs` `InfoType`, `Parse.Kvp` first-comma split).
- Matching is case-insensitive, first-N-tokens-must-match, each token via
  `Helper.CheckWild` (exact match, `*` wildcard, or numeric `min;max` range)
  (`InfoSelector.cs` `CheckArgs`).

Grill toward a concrete answer:

1. **Definition vs. usage direction** — confirm which side is "definition"
   for this feature's purposes: is a `poke[].parameter`/`pars` value the
   "write" (something is poked with this arg) and a `type: poke, X` the
   "read" (a rule that fires when poked with a matching arg)? State it
   explicitly, since (unlike custom saved keys) there's no natural
   write-then-read ordering — a poke can fire before or after the rule
   listening for it loads, and either side alone is a legitimate partial
   script (e.g. a poke meant to be caught by a rule in a file outside this
   batch). Decide whether that possibility (same reasoning as custom-key's
   "another mod/console command outside the batch" carve-out) means this
   should default to **info**, not warning, unless the scripter's own
   wording ("warning") is judged still right after weighing that risk.
2. **Matching primitive** — decide whether to reuse `keysCompatible`
   (case-insensitive exact/wildcard match) as-is, or whether poke's actual
   runtime matching (`CheckArgs`'s prefix-token-list semantics, `<...>`
   dynamic parameters inside a `parameter:` value acting as
   runtime-resolved literals same as custom keys) needs its own variant.
   `<pname>`-style dynamic segments in the scripter's own repro suggest the
   existing wildcard-skeleton approach (built for `<save_.../<load_...>`
   keys) transfers directly — confirm or find a real mismatch.
3. **"Stray" (unmatched declared parameter) severity + message** — name the
   parameter and its location, say what "no matching receiver" means
   concretely (per #1's info-vs-warning call), and point at the likely fix
   (add a matching `type: poke, <name>` rule, or confirm it's meant for a
   file outside this batch).
4. **"Likely typo" (near-miss trigger) severity + message** — this is
   explicitly framed by the scripter as "diagnosis arbitration": when a
   `type: poke, X` has no exact/wildcard match but a close one exists
   (`helloWord` vs. declared `helloWorld`), suggest the close match by name
   rather than only reporting "no matching parameter." Decide the
   closeness threshold/algorithm (can share design reasoning with
   [ticket 06](06-template-function-typo-detection.md)'s typo-distance
   question, but keep the two independent — different domains, no shared
   code expected). Given the scripter's own "diagnosis arbitration" framing,
   check whether this belongs in `shapeMismatchDiagnosis.ts` under the
   [Diagnosis Arbitration map](../../diagnosis-arbitration/map.md)'s
   ownership rule rather than as a standalone message in
   `referenceValidation.ts` — bring this cross-reference into that map's
   "Decisions so far" once resolved, don't silently fork ownership.
5. **Scope** — cross-file (matching every other reference check's batch-wide
   scope) unless a reason emerges to narrow it; `self: true`/prefab-scoping
   in the examples doesn't appear to change *matching* (poke dispatch isn't
   prefab-scoped per `InfoSelector.CheckArgs`), but confirm rather than
   assume.
6. **Duplication/clash check** (standing rule): confirm no overlap with
   [Correct name/data/poke entry field validation rules](../../validator-round3/issues/13-entry-field-validation-corrections.md)
   (that ticket left poke `:`/`;` unchanged, no definition/usage logic) or
   any `formatLint.ts` poke-adjacent check.

Implement once settled — likely lands in `referenceValidation.ts` alongside
the existing custom-saved-key definition/usage machinery, reusing
`walkKeySegments`/`findGroupEnd`/wildcard-matching primitives where #2
confirms they transfer. This map's grilling tickets carry execution.

## Answer

1. **Definition vs. usage direction**: a `poke[].parameter`/`pars` (or legacy top-level
   `pokeParameter`) declaration is the "write" side — a definite, textually-present intent to send
   an event; a `type: poke, X` (or `types:` entry) is the "read" side. Confirmed there's no natural
   ordering, per the ticket's own framing — a poke can legitimately be caught by a rule outside this
   batch (a different file not loaded, another mod, a console command), same carve-out class the
   custom-saved-key checks already rely on. **Default: stray declared parameter → info** (the
   direction with the real "maybe it's elsewhere" risk); **likely-typo trigger → warning** (a
   concrete, high-confidence fix already sits in the same batch, which is a materially different
   confidence level, not just "the scripter's wording was right anyway"). This deliberately answers
   the two severities differently rather than picking one blanket level for the whole ticket.
2. **Matching primitive**: reused `keysCompatible` as-is for pairwise token comparison — confirmed,
   not just assumed, by re-reading round3 research 11 §2b: both custom-key matching and
   `Helper.CheckWild` are fundamentally "case-insensitive string, wildcard/dynamic segments treated
   as `.*`" comparisons at the core, and `<pname>`-style dynamic segments inside a poke parameter
   transfer through the exact same `<...>`-as-wildcard skeleton logic already built for saved keys.
   One real, source-confirmed addition `CheckWild` has that custom-key matching doesn't: **comma-
   separated alternatives** on the trigger side (`type: poke, a,b` matches incoming `a` OR `b`) —
   layered on top via `pokeTriggerAlternatives()` rather than folded into `keysCompatible` itself,
   since custom keys never have that shape. Deliberately **not** reused: `CheckWild`'s numeric
   `min;max` range branch — poke *names* have no numeric-range use case, so implementing it would
   only add surface area no real script exercises.
3. **"Stray" severity + message**: **info**. Names the declared parameter, says concretely what "no
   matching trigger" means (`type: poke, ${name}` specifically, not a vague "unused"), and points at
   the fix while explicitly naming the legitimate alternative (a rule outside this batch/another mod)
   so the message doesn't read as an accusation.
4. **"Likely typo" severity + message**: **warning**, with the suggested name and an explicit "this
   is a close match declared in this batch" — i.e., it names *why* it's confident, not just *what* it
   thinks. Checked against the [Diagnosis Arbitration map](../../diagnosis-arbitration/map.md)'s
   anti-duplication contract as the scripter's own "diagnosis arbitration" framing asked: **confirmed
   out of scope for `shapeMismatchDiagnosis.ts`** — that catalog owns per-entry shape confusion
   resolved before ajv on one YAML item; this is batch-wide definition/usage matching, the same
   mechanism class as the existing data.yaml and custom-key checks already in `referenceValidation.ts`.
   Cross-reference recorded in that map's own Decisions-so-far, per its instruction not to silently
   fork ownership.
5. **Scope**: confirmed cross-file/batch-wide, matching every other reference check here — nothing in
   round3 research 11's `CheckArgs`/`InfoSelector` citations scopes matching to `self:`/prefab, and
   poke dispatch runs through one shared selector regardless of which prefab declared or is targeted
   by the poke.
6. **Duplication/clash check**: confirmed no overlap with [Correct name/data/poke entry field
   validation rules](../../validator-round3/issues/13-entry-field-validation-corrections.md) (left
   poke `:`/`;` punctuation unchanged, no definition/usage logic — this ticket is exactly that
   deferred feature) or any `formatLint.ts` poke-adjacent check (key-syntax only, never touches
   `<...>` template values or poke argument content).

**Design decision beyond the grill questions — scope to first-token matching only**: both worked
examples in the ticket (and every example round3 research 11 found in `docs/hacks.md`) compare only
the *first* poke argument, used like an event name. Real EWP matching (`CheckArgs`) is positional
across the *whole* argument list, but statically resolving arbitrary `<...>` values at arbitrary
non-first positions is the same class of runtime-state dependency this file's research already ruled
out of scope elsewhere (ticket 04's prefab/component-field findings) — so this feature deliberately
tracks only each side's first token, matching every real-world example rather than attempting full
positional-list modeling that would mostly just produce noise.

**Implementation**: `firstPokeToken`/`parseTypePokeParameter`/`pokeTriggerAlternatives`/
`pokeNameCompatible`/`collectPokeSignals` added to `referenceValidation.ts`; wired into
`runReferenceValidation()` as two new batch-wide passes (stray-declaration info, likely-typo
warning) over `pokeDeclarations`/`pokeTriggers` collected per rule entry (`poke[].parameter`/`pars`
— `pars` wins over `parameter` on the same item, matching `GetArgs`'s real branch — legacy top-level
`pokeParameter`, and `type:`/`types:` triggers whose head is `poke`). Typo suggestion reuses ticket
06's `levenshtein` helper (edit-distance ≤ 2, unique best match), restricted to fully-literal tokens
on both sides since comparing edit distance against a dynamic `<...>` skeleton is meaningless. New
`FileProblem.kind: "poke-parameter"`, mapped into the existing `REFERENCE_PROBLEM_CATEGORY`. Tests
cover both of the ticket's own repros (stray `helloWorld2`, typo'd `helloWord` — with the reciprocal
finding, confirmed intentional rather than a bug, that `helloWorld2` is flagged stray independently
of the typo warning, since they're genuinely two separate symptoms of one root cause), `pars`-over-
`parameter` precedence, legacy `pokeParameter`, `types:` list entries, case-insensitive/dynamic
wildcard matching, purely-dynamic tokens on both sides being skipped, no-suggestion-when-dynamic-or-
distant, and non-poke `type:` values producing nothing. `npx vitest run` (264/264 passed) and
`npx tsc --noEmit` (clean) both verified after the change.

Files: [referenceValidation.ts](../../../ewp_validator/src/referenceValidation.ts),
[referenceValidation.test.ts](../../../ewp_validator/src/referenceValidation.test.ts),
[fileManager.ts](../../../ewp_validator/src/fileManager.ts).
