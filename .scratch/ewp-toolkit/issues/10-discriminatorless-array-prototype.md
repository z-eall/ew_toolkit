# Prototype the top-level oneOf union for EWP/WEC's discriminator-less array

Type: prototype
Status: resolved
Blocked by: (none)

## Question

Ticket 02 confirmed EWP script files are one YAML array mixing four shapes with no tag field: EWP rule entries, WEC data entries, value entries, and value groups (see [[Discriminator-less array]] in CONTEXT.md). The schema needs a `oneOf`/`anyOf` union across these shapes, which JSON Schema validators are historically bad at producing readable errors for (a malformed entry can get reported against every branch it didn't match, rather than the one branch it was clearly attempting).

Build a small throwaway prototype: a `oneOf` JSON Schema covering the four shapes, tested against real mixed-content example files from the EWP repo (`examples_bosses.md` etc.) via monaco-yaml, including deliberately broken entries (typo'd key, wrong type). Evaluate whether monaco-yaml's error output is usable as-is, or whether the union needs restructuring (e.g. a cheap structural pre-check to pick the likely-intended branch before delegating to its full schema) to keep error messages pointing at the right thing.

Link the prototype as an asset when resolving.

## Answer

**Naive `oneOf` needs restructuring — use a structural pre-check.** Confirmed with a throwaway prototype (branch [`prototype/oneof-union-error-quality`](https://github.com/z-eall/ewp_toolkit/tree/prototype/oneof-union-error-quality), file `prototypes/PROTOTYPE-oneof-union-error-quality.html` — open directly in a browser to re-run):

- **Happy path**: a realistic mixed file (EWP rule entry + WEC data entry + value entry + value group, all in one array) validates cleanly under both approaches — the union shape itself is sound.
- **Typo'd key** (`prefeb` instead of `prefab`): naive `oneOf` across all four branches produced **15 raw Ajv errors**, repeating "should NOT have additional properties" / "should have required property" across every branch it failed — none of it says "you misspelled prefab." The structural pre-check (guess the intended shape from distinguishing keys — `valueGroup`/`value`/`name`+typed-lists-without-`prefab`/`type`, else default to EWP rule entry — then validate against only that one schema) produced **one clean error** scoped to the correctly-guessed branch.
- **Total mismatch** (an object matching none of the four shapes): naive `oneOf` produced **13 raw errors**; the pre-check produced 2, both correctly scoped to its default-guess branch.

**Decision for the real implementation**: don't rely on JSON Schema's native `oneOf` error output. Implement a structural pre-check (the same key-presence heuristic used in the prototype) to pick the likely-intended branch first, then validate against that single schema and surface only those errors. Keep `oneOf` (or `anyOf`) only as the underlying *acceptance* mechanism for what counts as valid — not as the source of user-facing error messages.
