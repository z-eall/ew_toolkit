# Detect stray (unmatched) and likely-typo `poke` parameter/trigger pairs

Type: grilling
Status: open
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

(pending)
