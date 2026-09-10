# Rework and rename Extended Reading

Type: task
Status: resolved
Blocked by: none

## Question

Rework the "Extended Reading" sidebar section to 5 pages, in this order (sidebar label, then slug):

1. Bee Ecosystem Overhaul (`bee-ecosystem`)
2. Build Custom Ship with Data (`custom-ship-data`)
3. World Boss Progression (`world-progression`)
4. Auto-upgrade Stations (`auto-upgrade-station`)
5. Village Cargo Mission (`village-cargo`)

`village-economy.mdx` conflates two different systems that happen to share `worldlevel`/`villageIDs` data — split into two individual pages. Maintainer pointed at `docs/guide-source/4-script-examples/` ("my 4-scripting-examples") as the real source to read back before reworking.

Once the split is confirmed against source: pull in extra detail found in the source but never ported to the live page (full 6-tier station table, full 15-village/11-destination cargo list, the `cargomaster` NPC interaction), and make World Boss Progression / Auto-upgrade Stations / Village Cargo Mission cross-link as one connected system — each usable standalone, but explicitly sold as a package since all three read/write the same `bfvworldlevel` EWP key (source-confirmed, not assumed: `world-bosses.mdx` and both halves of `village-economy.mdx` all reference the literal key `bfvworldlevel`).

## Answer

Read `docs/guide-source/4-script-examples/3-ewp-advanced/` in full — confirmed it's the "4-scripting-examples" the maintainer meant, and that `VillageStation`/`VillageCargo` were always two separate source file pairs, never one system. Confirmed via source that World Boss Progression, Auto-upgrade Stations, and Village Cargo Mission all read/write the literal same key `bfvworldlevel` — the "package" framing is a real fact about the live server, not an invented tie-in.

- Renamed `ship-modification.mdx` → `custom-ship-data.mdx` ("Build Custom Ship with Data"), `world-bosses.mdx` → `world-progression.mdx` ("World Boss Progression" — title barely changed, already close). Retitled `bee-ecosystem.mdx` to "Bee Ecosystem Overhaul" (slug unchanged).
- Deleted `village-economy.mdx`, split into two new pages:
  - `auto-upgrade-station.mdx` ("Auto-upgrade Stations") — the crafting-station/feast sealing half. Added the full six-tier station table and the two 7-tier Feast tables as reference tables (previously cut as "same pattern repeated" — now included per maintainer request).
  - `village-cargo.mdx` ("Village Cargo Mission") — the real-time cargo-spawn half. Added the full 15-village/11-destination name list, the world-level-keyed village/cargo-amount table, the tent reset-on-pickup rule (needed to complete the spawn→collect→reset loop, wasn't on the old page at all), and the `MarketPlaceNPC`/`cargomaster` NPC-trigger path (kept flagged unconfirmed — that prefab isn't in Jotunn's list, same caution the old page already carried).
- Each of the three progression pages (World Boss Progression, Auto-upgrade Stations, Village Cargo Mission) got a "Part of a bigger system" `<Aside>` near the top and a short "where this connects" section near the bottom, cross-linking the other two and naming the shared `bfvworldlevel` key. Explicitly framed as standalone-first, connected-as-a-bonus — not required reading order.
- `astro.config.mjs`'s Extended Reading sidebar updated to the 5-item order above.
- Fixed 3 stale cross-links to the old URLs/titles: `advanced-triggers-change.mdx` (Village Economy → Auto-upgrade Stations), `advanced-triggers-time.mdx` (World Bosses → World Boss Progression), `ewp-key.mdx` (updated to name and link all three new/renamed pages instead of the old two).
- Registered `docs/guide-source/4-script-examples/3-ewp-advanced/`'s two file pairs in `docs/sources.md` (community tier).
- Deliberately **not** added: a Feast-refill mechanic spotted in the station source (`type: change` + `injectData:`) — `injectData:`'s real semantics aren't confirmed anywhere this wiki can cite yet, and it wasn't part of what the maintainer asked to pull in. Left for a future ticket if wanted.

Build verified clean via WSL (a reusable `build-check.sh` helper was added under this ticket's folder to work around the recurring Windows-npm-shim-on-PATH issue — sources `nvm.sh` explicitly rather than relying on an interactive shell): 33 pages, no errors.
