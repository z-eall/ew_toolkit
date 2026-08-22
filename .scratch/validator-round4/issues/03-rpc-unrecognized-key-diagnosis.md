# Fix misleading diagnosis for unrecognized non-numeric RPC entry keys (e.g. `triggerRules:`, `remove:`)

Type: grilling
Status: resolved
Blocked by: (none)
Parent: [Validator Round 4 map](../map.md)

## Question

Scripter repro:

```yaml
objectRpc:
- name: RPC_Damage
  1: hit, lightning=1.0 block=true dodge=true
  triggerRules: true
- name: RPC_Damage
  1: hit, damage=<load_neckzillaKilled>
  delay: 3
  triggerRules: true
  remove: true
```

Current diagnosis:

```
unnamed.yaml:13 — `triggerRules:` under `objectRpc:` must be text (a string). [Value problem]
unnamed.yaml:13 — `remove:` under `objectRpc:` must be text (a string). [Value problem]
```

The scripter's own read: the flag is *directionally* correct (`triggerRules`/
`remove` are real fields on `spawnData`, not on an RPC entry — nested in the
wrong place), but the message is also wrong, because quoting the value
(`triggerRules: "true"`) still doesn't fix anything real.

Root cause, source-grounded (`schema/generate.mjs` ~123-143): `rpcEntry` is
modeled as EWP's true open `Dictionary<string,string>` (C#, `PrefabData.cs`)
— a deliberate design, not a bug, since numbered call-args (`"1"`, `"2"`, …)
and future/undocumented RPC-specific keys must stay legal. Only a short
known-keys list (`name`, `target`, `chance`, `weight`, `delay`, `repeat`,
`repeatInterval`, `repeatChance`, `overwrite`, `source`, `packaged`) gets
real typing; everything else falls to
`additionalProperties: { type: "string" }`. So:

- A boolean `triggerRules: true` fails that catch-all string check → the
  "must be text" message.
- A quoted `triggerRules: "true"` **passes** — ajv has no way to know this
  key isn't a real RPC field, only that its value happens to be a string.
  `rpcValidation.ts`'s `checkRpcParams()` (the module that *does* know RPC
  semantics) only inspects numeric keys (`/^[1-9][0-9]*$/`, line 65) —
  non-numeric unrecognized keys are entirely unchecked once string-typed.

So the real bug isn't the type message being wrong on the boolean case — the
type message is accidentally *right* there but for the wrong reason (open
dict, not real validation), and it goes silent exactly when the scripter
"fixes" it by quoting, which is the worst of both worlds: a message that
looks like a type fix will help, when the actual problem (wrong key
entirely) persists invisibly.

Grill toward a concrete answer:

1. **Source-verify** RPC entries' true accepted key set against
   `PrefabData.cs`/wherever RPC dictionaries are consumed at runtime — is
   `additionalProperties: string` still correct as an *acceptance* rule (it
   must be, C# won't reject unknown dict keys), or does EWP's own dispatch
   silently drop/ignore unrecognized non-numeric keys in a way worth naming
   explicitly in the message?
2. **Design the real fix**: a new check (in `rpcValidation.ts`, alongside
   `checkRpcParams()`, not duplicating it) that flags a non-numeric key that
   isn't in the known-keys list *and* isn't a real numbered call-arg — e.g.
   "RPC entries don't recognize `triggerRules:` — it does nothing here (it's
   a `spawn:`/`swap:` field). Remove it or move it to the right entry."
   Decide severity (this is close to Value problem territory but is really
   a *dead/no-op key*, which the existing category taxonomy in
   `diagnosisCategories.ts` doesn't currently have language for — check
   whether "Value problem" still fits, or whether this belongs under
   "Structure problem" instead, per the naming principles documented at the
   top of that file) and whether it should suppress the current
   `additionalProperties`-string ajv message on the same key entirely (so a
   scripter never again sees the misleading "must be text" for this
   specific class of mistake) via `structuralPrecheck.ts`'s existing
   suppress-path mechanism.
3. **Duplication check** (mandatory per the
   [Diagnosis Arbitration map](../../diagnosis-arbitration/map.md)'s
   anti-duplication contract and the
   [EW Toolkit map](../../ew_toolkit/map.md)'s two-step standing rule):
   confirm this is distinct from
   [RPC orphan list-item shape diagnosis](../../diagnosis-arbitration/issues/03-rpc-orphan-list-item-diagnosis.md)
   (already resolved — that one is about a *missing* `name:`/sibling-item
   shape, this one is about an unrecognized *key* on an otherwise
   well-formed entry) and from Round 3's
   [RPC validation rework](../../validator-round3/issues/12-rpc-validation-rework.md)
   (numeric-param type aliasing only). If a new row is warranted, it likely
   belongs in `shapeMismatchDiagnosis.ts` per that map's ownership rule
   rather than as ad-hoc logic in `rpcValidation.ts`.
4. Decide whether this generalizes: should *any* schema-open-dictionary
   field (RPC entries are the only current example) get this "known-key vs.
   silently-accepted-but-inert key" treatment, or is this narrowly an RPC
   fix? Keep scope to RPC unless the grilling reveals another live case.

Implement once the shape is settled — this map's grilling tickets carry
execution.

## Answer

**1. Source-verify**: `additionalProperties: { type: "string" }` on `rpcEntry`
stays correct as an *acceptance* rule — C#'s `Dictionary<string,string>`
(`PrefabData.cs`) never rejects an unknown key, so ajv can't reject it either
without breaking legitimate numbered call-args and any future/undocumented
RPC-specific key. Nothing in the runtime *dispatch* path explicitly drops
non-numeric unrecognized keys either — they're just never read, so they're
inert rather than actively rejected. Confirmed EWP's `Data` class
(`ewpRuleEntry` in the generated schema) and `SpawnData` class (`spawnData`)
both really do declare `triggerRules`/`remove` as their own fields — this
is a genuine wrong-nesting mistake, not a scripter inventing a nonexistent
field.

**2. The fix**: added `checkRpcUnrecognizedKeys()` to
[rpcValidation.ts](../../../ewp_validator/src/rpcValidation.ts) as a sibling
to `checkRpcParams()` — same entry, but walking non-numeric keys instead of
numbered ones, and independent of whether the RPC name has a documented
param table (unlike `checkRpcParams`, which returns `[]` for an unknown RPC
name — a wrong key is wrong regardless of whether we also recognize the RPC
itself). The known-key set (`name`, `target`, `chance`, …) and the
rule-entry/spawnData field sets used to build the "did you mean the rule
entry?" hint are all read from `schema.generated.json` at runtime rather
than hand-duplicated, so they can't drift from the schema. Message names the
real field's home (rule entry, spawn:/swap: entry, or both — `remove` is
rule-entry-only, `triggerRules` exists on both) and explicitly says the
value being written correctly doesn't matter, closing exactly the gap the
scripter found: quoting the value no longer makes the warning disappear.
Wired into `structuralPrecheck.ts`'s existing per-entry RPC loop (alongside
`checkRpcParams`), reusing the same `rpcSuppressPaths` mechanism so the raw
ajv "must be text"/"must be string" error on that key is suppressed exactly
as `checkRpcParams`'s issues already are — no changes needed to
`dataFieldValidation.ts` or its `scalarDataFieldTypeMessage()` fallback
(out of scope for this session anyway), since suppression happens before
that fallback ever runs.

**Category**: `STRUCTURE_PROBLEM_CATEGORY`, not `VALUE_PROBLEM_CATEGORY`.
Precedent: `diagnoseWecNameTypo()` in `shapeMismatchDiagnosis.ts` — an
entirely-wrong-key mistake (`data:` instead of `name:`) already uses
`STRUCTURE_PROBLEM_CATEGORY`, while `VALUE_PROBLEM_CATEGORY` is reserved
(per `diagnosisCategories.ts`'s own naming principle and every existing
`shapeMismatchDiagnosis.ts` row) for a *right key, wrong value shape*
mistake. `triggerRules:`/`remove:` here is a right-key-wrong-place mistake —
matches the Structure bucket exactly, not Value. Severity: `warning`,
matching every other RPC/WEC shape-confusion diagnosis in this file
(`checkRpcParams` issues, orphan-sibling, missing-name, WEC name typo) —
these are all silent-no-op mistakes EWP accepts without erroring, not hard
parse failures.

**3. Duplication check**: confirmed distinct from both cited tickets.
[RPC orphan list-item shape diagnosis](../../diagnosis-arbitration/issues/03-rpc-orphan-list-item-diagnosis.md)
covers a *missing* `name:`/mis-split sibling-list-item shape (structurally,
an entire entry in the wrong place); this ticket covers an unrecognized
*key* on an otherwise well-formed, correctly-named entry — no shared repro,
no shared instancePath. Round 3's
[RPC validation rework](../../validator-round3/issues/12-rpc-validation-rework.md)
reworked only numbered-parameter type aliasing/case-sensitivity/missing-param
logic inside `checkRpcParams()` itself — untouched by this change, which
lives in a new sibling function.

**Ownership call (the real judgment call in this ticket)**: the ticket text
suggested this might belong in `shapeMismatchDiagnosis.ts` per that map's
anti-duplication/ownership contract. Decided against it: that module's
OWNERSHIP comment scopes it to entry-*shape* confusions across
`ewpRuleEntry`'s nested arrays (`objects`/`spawn`/`poke`/etc. scalar-vs-list
mistakes) plus the two existing RPC entry-shape rows
(`diagnoseRpcOrphanListItems`, `diagnoseWecNameTypo`) that arbitrate whole-
entry placement. But `checkRpcParams()` — the check this new function is
structurally a sibling of — already lives in `rpcValidation.ts` and already
drives its own message text *and* its own ajv-suppression path directly from
`structuralPrecheck.ts`, bypassing `shapeMismatchDiagnosis.ts` entirely, for
exactly this same class of "per-key check on an RPC entry" logic. Splitting
non-numeric-key checks into `shapeMismatchDiagnosis.ts` while numbered-key
checks stay in `rpcValidation.ts` would put two per-key RPC checks that
share the same suppression mechanism and the same call site into two
different modules for no reason other than which regex the key matches —
worse for a future reader than keeping RPC per-key logic in one place. Kept
in `rpcValidation.ts`.

**4. Generalization**: scoped to RPC only, per the ticket's own default.
`rpcEntry` is the only `additionalProperties: { type: "string" }`
open-dictionary shape in the schema today (every other object type in
`schema/generate.mjs` sets `additionalProperties: false`) — there is no
other live case to generalize to, so a generic "open-dict known-key"
abstraction would be speculative. Revisit only if a future EWP field is
added as another true open dictionary.

**Tests**: `rpcValidation.test.ts` — 5 new cases (`checkRpcUnrecognizedKeys`
directly: rule-entry-only field, dual rule-entry/spawnData field, quoted
value still flags, fully-unknown key, known keys never flagged).
`structuralPrecheck.test.ts` — 3 new integration cases reproducing the
ticket's exact `triggerRules:`/`remove:` repro end-to-end through
`runStructuralPrecheck()`, confirming the raw "must be text"/"must be
string" message no longer appears and the new Structure-problem warning
does. `npx vitest run` (251 tests, 8 new) and `npx tsc --noEmit` both pass
clean.
