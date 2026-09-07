# ew_wiki — Trusted Sources

Reference list for source-verifying wiki content, per [AGENTS.md](../AGENTS.md)'s source-verify rule. Every source here is pre-approved — check here before asking for research signoff. Found a source that isn't listed? Get signoff once (hub-wide rule), then add it below so the next guide doesn't re-ask.

Each entry: link/path, tier (**official** — from Jere or Iron Gate/Coffee Stain directly; **community** — forums, wikis, hosting vendors, player-written guides), and what it's good for.

## EWP

- `ewp_validator/src/schema.generated.json` and its `*.test.ts` fixtures (in this repo) — **official**, generated straight from EWP's own schema. Check here first for any key/value/type question — fastest ground truth, no network round-trip.
- [expand_world_prefabs](https://github.com/JereKuusela/valheim-expand_world_prefabs) (GitHub, Jere Kuusela) — **official**, the mod's own C# source and README. Ground truth for valid keys/values/mechanics when `ewp_validator/src/schema.generated.json` doesn't settle it (e.g. `type:`'s real enum — confirmed `create`, not the guessed `spawn`, see ticket 04 round 3).
  - [`docs/scripting.md`](https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/docs/scripting.md) inside that same repo — the mod's own prose reference for every top-level rule-entry field, `type:`'s full trigger list with per-type semantics, and the `filter:`/`bannedFilter:`/`filters:`/`filterLimit:` system. Better than reading the C# directly for anything field-shaped; check here before the schema for *meaning*, the schema for *valid values*.
- `docs/guide-source/1-theory-fundamental/EWP_How_To_Use_Data.md` (local file, DhakhaR) — **community**, original author guide. Source for v1's client-side `BepInEx\config` paths, `infinity_tools.yaml`/`data.yaml` behavior. Re-check anything from here against a live/current source before reuse — written before this correction pass caught errors in how it was applied.

## WEC

- [world_edit_commands](https://github.com/JereKuusela/valheim-world_edit_commands) (GitHub, Jere Kuusela) — **official**, the mod's own C# source and README. Use for any WEC-specific command/behavior claim.
  - [`README_data.md`](https://github.com/JereKuusela/valheim-world_edit_commands/blob/main/README_data.md) inside that same repo — the mod's own prose reference for the `data` command, every value-type list (`ints`/`floats`/`strings`/`longs`/`vecs`/`quats`/`bools`/`hashes`/`items`/etc.), parametrized/randomized data entries, value groups, and chest loot generation (`itemAmount`, `chance`, `containerSize`). The loot-generation section is the real-source backing for any "loot & drop tweaks" content.
- [valheim-dev / ServerDevcommands](https://github.com/JereKuusela/valheim-dev) (GitHub, Jere Kuusela) — **official**, a separate mod WEC depends on (`using ServerDevcommands;`). Commands WEC itself doesn't register (e.g. `search_component`, `search_item`) live here.

## Valheim game data (components, fields, prefabs)

- [Jotunn data dumps](https://valheim-modding.github.io/Jotunn/data/intro.html) (Jotunn modding library docs) — **community** (auto-generated from the live game, not Jere's own docs). Prefab list confirms which components a prefab has (e.g. `portal_wood` → `Piece`/`WearNTear`/`TeleportWorld`); does **not** dump individual field names per component.
- [valheimtools.stream/wiki/components](https://valheimtools.stream/wiki/components) — **community** (per-component field dumps, decompiled). Cross-check reference only per hub-wide `AGENTS.md` (never a dependency) — used here only to verify field names already claimed elsewhere, e.g. confirmed `TeleportWorld.m_allowAllItems` real, and caught `activationDistance` as wrong (the real field is `m_activationRange`).

## Valheim / hosting / BepInEx

- [Dedicated servers – Valheim Wiki (Fandom)](https://valheim.fandom.com/wiki/Dedicated_servers) — **community** (fan wiki, documents Iron Gate's official SteamCMD install steps). Used for: dedicated-server app id (`896660`), default install path shape.
- [BepInEx dedicated-server discussion #1194](https://github.com/BepInEx/BepInEx/discussions/1194) — **community** (GitHub discussion, not BepInEx's own docs). Used for: `BepInEx\config` sitting beside `valheim_server.exe`/`valheim_server.x86_64`.
- [How to Add/Install Mods to a Valheim Server – XGamingServer](https://xgamingserver.com/blog/how-to-add-install-mods-to-a-dedicated-valheim-server/) — **community** (hosting vendor blog). Used for: general dedicated-server BepInEx folder placement.

## Community-observed, no single source

Facts with wide community agreement but no citable official doc. Mark these clearly in the page itself (e.g. an `<Aside type="note">`) — never present as if sourced.

- `BepInEx\config\expand_world` is EWP's own auto-generated, conventional script folder — EWP scans every subfolder under `config`, but this is the one it creates and uses itself. Maintainer-confirmed, no doc link. Used in: Preparation page's "Getting a script onto your server."
- Load order matters between data and scripts: a script referencing a data entry that isn't loaded yet errors; unused/unloaded data alone does not. Resaving a script's `.yaml` after new data loads makes EWP re-check it against that data. Maintainer-confirmed from direct experience, no doc link. Used in: Preparation page's "Rule of thumb: load data before scripts."
