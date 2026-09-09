# ewp_validator — Trusted Sources

Reference list for source-verifying validation rules, per [AGENTS.md](../AGENTS.md)'s "Validation rule lifecycle" step 1 (Source-verify). Every source here is pre-approved — check here before asking for research signoff. Found a source that isn't listed? Get signoff once (hub-wide rule), then add it below so the next rule doesn't re-ask. Same mods this validator checks scripts for as `ew_wiki` documents — see [`ew_wiki/docs/sources.md`](../ew_wiki/docs/sources.md) for the parallel wiki-content list.

Each entry: link/path, tier (**official** — from Jere directly; **community** — forums, decompiled dumps, hosting vendors), and what it's good for.

## EWP

- `src/schema.generated.json` and its `*.test.ts` fixtures (in this repo) — **official**, generated straight from EWP's own schema. Check here first for any key/value/type question — fastest ground truth, no network round-trip.
- [expand_world_prefabs](https://github.com/JereKuusela/valheim-expand_world_prefabs) (GitHub, Jere Kuusela) — **official**, the mod's own C# source and README. Ground truth for exactly how a rule computes or loads something when the generated schema doesn't settle it (e.g. `InfoSelector.cs`'s `Randomize()` for weight selection, `FileLoading.cs` for what `data.yaml` entries EWP itself loads).
  - [`docs/scripting.md`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/docs/scripting.md) — the mod's own prose reference for every top-level rule-entry field, `type:`'s full trigger list, and the `filter:`/`bannedFilter:`/`filters:`/`filterLimit:` system. Better than reading the C# directly for anything field-shaped; check here before the schema for *meaning*, the schema for *valid values*.
  - [`docs/functions.md`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/docs/functions.md) — the mod's own complete list of every `<name_param>` function, by category.
  - [`docs/RPCs.md`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/docs/RPCs.md) — the mod's own complete list of every supported `objectRpc:`/`clientRpc:` `name:` value; `schema/parse-rpcs.mjs` rebuilds `rpcParams.generated.ts` from this on every schema-generate run (see AGENTS.md's severity-calibration rule for why doc-generated rules stay warning-only).

## WEC

- [world_edit_commands](https://github.com/JereKuusela/valheim-world_edit_commands) (GitHub, Jere Kuusela) — **official**, the mod's own C# source and README. Use for any `data.yaml` entry whose real shape is WEC's own, not EWP's (`DataLoading.cs` for what WEC loads) — the two mods are independent implementations of the same folder convention, not a coupled pair, per AGENTS.md's Source-verify step.
  - [`README_data.md`](https://github.com/JereKuusela/valheim-world_edit_commands/blob/main/README_data.md) — the mod's own prose reference for the `data` command, every value-type list (`ints`/`floats`/`strings`/`longs`/`vecs`/`quats`/`bools`/`hashes`/`items`/etc.).
- [valheim-dev / ServerDevcommands](https://github.com/JereKuusela/valheim-dev) (GitHub, Jere Kuusela) — **official**, a separate mod WEC depends on (`using ServerDevcommands;`). Commands WEC itself doesn't register live here.

## Community-observed, no single source

Facts with wide community agreement but no citable official doc. Mark these clearly at the point of use (a code comment, not silent) — never present as if runtime-verified line-by-line.
