# `locations`/`bannedLocations`/`locationDistance` + `exteriorRadius` — research and size the topic

Type: research
Status: resolved

## Question

EWP's `locations`/`bannedLocations`/`locationDistance`/`bannedLocationDistance` filters (matching/filtering by named map locations) have zero mentions anywhere on the live wiki. The maintainer flagged a specific wrinkle: this feature reportedly uses the base game's `exteriorRadius` concept, which is **different from `maxDistance:`** (the distance concept every existing page already teaches) — worth explaining precisely so readers don't conflate the two. Surfaced by a `/wayfinder` review, 2026-09-14.

The maintainer is explicitly unsure whether this is solo-page-worthy or would be "overdoing it" — **this ticket's job is to find out, not to assume a solo page**. Research:
1. What `locations`/`bannedLocations`/`locationDistance` actually match against (named location instances placed in the world — dungeons, altars, etc.) and how `exteriorRadius` factors into the distance check, source-verified against the real C# (not yet fetched in any existing research — this is new ground).
2. How `exteriorRadius` differs mechanically from `maxDistance:` — precise enough that ticket 32 can write an accurate "these are not the same thing" explanation.
3. How commonly this feature is likely to be reached for, relative to the wiki's existing beginner→intermediate→advanced content (a judgment call to report, not just raw facts) — this directly feeds whether ticket 32 should scope a full page, a short section on an existing page (e.g. alongside `maxDistance:`/`connected:` on [Advanced Poke - Mechanics](../../ew_wiki/src/content/docs/ewp/concepts/advanced-poke-mechanics.mdx)), or gets folded into a broader "matching/filtering" page if one exists by the time this resolves.

## Notes

Blocks [ticket 32](32-locations-page-decision.md). Report a clear recommendation on sizing in the Answer — don't leave the page-vs-section call to ticket 32 to guess at without your findings.

## Answer

### 1. What `locations:`/`bannedLocations:`/`locationDistance:` match, and how `exteriorRadius` factors in

Source: EWP's `docs/scripting.md` ("Filters" section) plus `ExpandWorldPrefabs/InfoSelector.cs` (`CheckLocations`/`CheckRequiredLocations`/`CheckBannedLocations`, ~lines 76-206), `PrefabData.cs` (field declarations), `PrefabLoading.cs` (line 143-146, default wiring), all fetched fresh this session — first time this repo has read them.

`docs/scripting.md` documents the fields plainly:
- `locations`: List of location ids. At least one must be nearby.
- `locationDistance` (default `0` meters): Search distance for nearby locations. **If 0, uses the location exterior radius.** Also affects banned locations unless `bannedLocationDistance` is set separately.
- `bannedLocations` / `bannedLocationDistance`: same shape, inverted (none must be nearby).

The real C# in `InfoSelector.cs` confirms and sharpens this:
- A "location" here means a placed **location instance** in the world — the game's own dungeons, altars, boss spawn points, points of interest, etc. — tracked by Valheim's `ZoneSystem.instance.m_locationInstances`, keyed by zone. EWP walks the zones within search range and matches each instance's `loc.m_location.m_prefabName` against the `locations:`/`bannedLocations:` id list.
- The actual distance check: `var dist = d.LocationDistance == 0 ? loc.m_location.m_exteriorRadius : d.LocationDistance;` then `Utils.DistanceXZ(loc.m_position, pos) <= dist`. So when `locationDistance:` is left unset (0), EWP does **not** invent its own default — it reads that specific location instance's own baked-in `m_exteriorRadius` value and uses it as the search radius. Sizable locations (a big dungeon) get a bigger free radius than small ones, with zero YAML needed.
- `Utils.DistanceXZ` is flat 2D (X/Z plane) distance, matching every other distance filter in EWP — no vertical component.
- One real quirk worth flagging on the page: `bannedLocationDistance` defaults to `data.bannedLocationDistance ?? data.locationDistance ?? 0f` (`PrefabLoading.cs` line 144) — if you set `locationDistance:` but not `bannedLocationDistance:`, the banned check silently inherits the same number, exactly as the docs prose says but easy to miss on a skim.

### 2. `exteriorRadius` vs `maxDistance:` — precisely how they differ

**Citation upgraded 2026-09-14** (`/wayfinder` follow-up, maintainer-prompted): originally cited `valheimtools.stream/wiki/components` (community tier). Re-verified directly against Valheim's own decompiled source, `C:\Users\Ultimate\Claude\valheim-modding\decompiled\current\assembly_valheim\Location.cs` — `public float m_exteriorRadius = 20f;` (line 8), used by the component's own `GetExteriorRadius()`-shaped logic (`Mathf.Max(m_exteriorRadius, m_interiorRadius)` when interior detection is off, ~line 105). `Location` is a base-game Valheim component; EWP just reads a value Valheim's own world generator already stamped onto that location prefab (roughly: how big a circle around the location's origin counts as "at/near this location," used by the base game for its own spawn-exclusion and placement logic). The community-site citation and the decompiled-source citation agree — this is a strengthening, not a correction.

That makes it mechanically unrelated to `maxDistance:`, despite both being "a distance number in EWP filters." Three separate distance concepts exist in EWP, easy to conflate:
1. **Location proximity** (`locationDistance:`/`bannedLocationDistance:`) — distance from a specific placed location *instance*, defaulting to that instance's own pre-baked `exteriorRadius` (varies per location, set by the base game).
2. **Rule-level `maxDistance:`/`minDistance:`** (in the same general "Filters" list as `locations:`) — distance from the **world center** `(0,0,0)`, a fixed origin, author-set, no default tie to any object.
3. **Poke's own `maxDistance:`/`minDistance:`** (documented on Advanced Poke - Mechanics) — distance from the **triggering/poking object**, default 100m, again author-set with no relation to `exteriorRadius`.

None of these three share a mechanism. The wiki currently only teaches #3. Bundling `locations:` into the poke page risks the reader assuming it's "poke's distance system with an extra name filter," which is wrong on two counts: it's not poke-specific (it's a general rule filter usable on any trigger type — `create`, `change`, `state`, `poke`, etc.), and its default distance isn't author-chosen at all, it's read off the target.

### 3. How often this is likely to be reached for — and sizing recommendation

`locations:`/`bannedLocations:` sits in `scripting.md`'s general "Filters" list alongside ~25 other rule-scoped filter fields: `biomes`/`bannedBiomes`, `day`/`night`, `admin`, `minX`/`maxX`/`minZ`/`maxZ`/`minY`/`maxY`, `minAltitude`/`maxAltitude`, `minTerrainHeight`/`maxTerrainHeight`, `paint`/`minPaint`/`maxPaint`, `environments`/`bannedEnvironments`, `globalKeys`/`bannedGlobalKeys`, `keys`/`bannedKeys`, `events`/`eventDistance`, `playerEvents`/`bannedPlayerEvents`, `groups`/`bannedGroups`. **None of these siblings has any dedicated wiki coverage at all today** — not even `biomes:` or `events:`, which are almost certainly reached for more often than "gate a rule by proximity to a named dungeon/altar." Locations is a narrower, more advanced use case than most of that sibling list, not a broader one.

Separately, the wiki's existing `filter:`/`filters:`/`condition:` family (`basic-filter.mdx`, `advanced-filter-plural.mdx`, `advanced-filter-condition.mdx`) is a *different* sub-family within that same "Filters" section of `scripting.md` — those check the triggering **object's own data** (a ZDO field/value), not world/environment context. `locations:` belongs with the environmental/proximity group (biomes, events, day/night), not with `filter:`/`condition:`. There is no existing page that is a clean semantic home for it.

**Recommendation: short section, not a solo page, and not on Advanced Poke - Mechanics.**

- **Not a solo page.** Giving `locations:` its own page while ~25 comparably-or-more-common sibling filters (`biomes:`, `events:`, `day:`/`night:`) get zero coverage would be inconsistent favoritism toward a narrow, advanced feature — this is the "overdoing it" the maintainer flagged, and the evidence backs the worry.
- **Not Advanced Poke - Mechanics**, despite the ticket's suggested candidate. That page's `maxDistance:`/`minDistance:` section is specifically about distance-from-the-poker (concept #3 above); `locations:` is a general rule filter with a completely different default mechanism (concept #1). Placing them side by side teaches a false equivalence exactly where question 2 says precision matters most.
- **Best fit: a short new section on `advanced-filter-plural.mdx`** (the more reference-shaped of the two existing "Filters"-section pages, already the closest existing kin — same source-section as `locations:`, already sourced from `scripting.md`'s "Filters" heading per its own note). Cover `locations:`/`bannedLocations:`/`locationDistance:`/`bannedLocationDistance:` in one short, self-contained subsection: what a "location" is (a placed instance, not a biome or zone), the `exteriorRadius`-as-default mechanic, one short example, and one explicit contrast sentence against poke's `maxDistance:` with a cross-link to Advanced Poke - Mechanics so a reader who lands on either page gets redirected to the right mental model instead of conflating them.
- If ticket 32 judges `advanced-filter-plural.mdx` a poor fit for editorial-flow reasons, `advanced-filter-condition.mdx` is the only other reasonable candidate (same rationale) — but do not use Advanced Poke - Mechanics.
