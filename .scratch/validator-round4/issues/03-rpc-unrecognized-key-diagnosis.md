# Fix misleading diagnosis for unrecognized non-numeric RPC entry keys (e.g. `triggerRules:`, `remove:`)

Type: grilling
Status: open
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

(pending)
