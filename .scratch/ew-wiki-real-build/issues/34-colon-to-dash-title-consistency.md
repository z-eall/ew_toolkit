# Advanced-page titles: colon vs. dash — make consistent

Type: task
Status: closed
Claimed by: Claude (this session, 2026-09-16)

## Question

Site convention drifted: 5 Advanced-tier pages use `Category - Subtopic` (dash) — `Advanced Poke - Mechanics`, `Advanced Poke - Creative Systems`, `Advanced Triggers - type: change`, `Advanced Triggers - type: time`, `Advanced Triggers - type: realtime`, `Advanced Triggers - No-Prefab Triggers` (6, not 5 — recount at execution time) — while 5 other pages use `Category: Subtopic` (colon) — `Advanced Filter: Condition`, `Advanced Filter: Plurals`, `Custom Data: EWP Key`, `Custom Data: Your Own Flags`, `Filter: by Objects`. Dash is the more common pattern (confirmed by grepping every `title:` under `ew_wiki/src/content/docs/ewp/concepts/`, 2026-09-14).

Found while naming the new `Advanced Functions - Player Identity` page on the [Player Identity & Object Ownership map](../../ew-wiki-player-identity/map.md) — the maintainer pointed out the colon pages are the real outlier, not dash.

Task: rewrite the 5 colon-titled pages' `title:` frontmatter to the dash form (`Advanced Filter - Condition`, `Advanced Filter - Plurals`, `Custom Data - EWP Key`, `Custom Data - Your Own Flags`, `Filter - by Objects`), and grep the rest of the site for any place these titles are spelled out in link text/prose (not just the sidebar, which reads frontmatter automatically) so nothing goes stale. Mechanical text swap, not a content-shape decision — no prototype/signoff gate needed, but still verify with a clean local build afterward per this repo's usual "build verified clean, N pages" convention.

## Answer

Rewrote all 5 colon-titled pages' `title:` frontmatter to the dash form: `Advanced Filter - Condition`, `Advanced Filter - Plurals`, `Custom Data - EWP Key`, `Custom Data - Your Own Flags`, `Filter - by Objects`. Grepped the whole site for the old titles spelled out in link text/prose (not just frontmatter) — found 21 stale mentions across 13 files (bee-ecosystem, custom-ship-data, world-progression, auto-upgrade-station, village-cargo, advanced-triggers-no-prefab, advanced-poke-creative-systems, advanced-functions, basic-functions, basic-filter, advanced-filter-plural, objects-filtering, basic-poke, ewp-key) and fixed all of them.

Verified with a clean production build (not just dev): 35 pages, no errors, no broken-link warnings.
