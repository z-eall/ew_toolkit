# ew_wiki — Trusted Sources

Reference list for source-verifying wiki content, per [AGENTS.md](../AGENTS.md)'s source-verify rule. Every source here is pre-approved — check here before asking for research signoff. Found a source that isn't listed? Get signoff once (hub-wide rule), then add it below so the next guide doesn't re-ask.

Each entry: link/path, tier (**official** — from Jere or Iron Gate/Coffee Stain directly; **community** — forums, wikis, hosting vendors, player-written guides), and what it's good for.

## EWP

- `guide-reference/1Theory Fundamental/EWP_How_To_Use_Data.md` (local file, DhakhaR) — **community**, original author guide. Source for v1's client-side `BepInEx\config` paths, `infinity_tools.yaml`/`data.yaml` behavior. Re-check anything from here against a live/current source before reuse — written before this correction pass caught errors in how it was applied.

## WEC

*(none yet)*

## Valheim / hosting / BepInEx

- [Dedicated servers – Valheim Wiki (Fandom)](https://valheim.fandom.com/wiki/Dedicated_servers) — **community** (fan wiki, documents Iron Gate's official SteamCMD install steps). Used for: dedicated-server app id (`896660`), default install path shape.
- [BepInEx dedicated-server discussion #1194](https://github.com/BepInEx/BepInEx/discussions/1194) — **community** (GitHub discussion, not BepInEx's own docs). Used for: `BepInEx\config` sitting beside `valheim_server.exe`/`valheim_server.x86_64`.
- [How to Add/Install Mods to a Valheim Server – XGamingServer](https://xgamingserver.com/blog/how-to-add-install-mods-to-a-dedicated-valheim-server/) — **community** (hosting vendor blog). Used for: general dedicated-server BepInEx folder placement.

## Community-observed, no single source

Facts with wide community agreement but no citable official doc. Mark these clearly in the page itself (e.g. an `<Aside type="note">`) — never present as if sourced.

- `BepInEx\config\expand_world` is EWP's own auto-generated, conventional script folder — EWP scans every subfolder under `config`, but this is the one it creates and uses itself. Maintainer-confirmed, no doc link. Used in: Preparation page's "Getting a script onto your server."
- Load order matters between data and scripts: a script referencing a data entry that isn't loaded yet errors; unused/unloaded data alone does not. Resaving a script's `.yaml` after new data loads makes EWP re-check it against that data. Maintainer-confirmed from direct experience, no doc link. Used in: Preparation page's "Rule of thumb: load data before scripts."
