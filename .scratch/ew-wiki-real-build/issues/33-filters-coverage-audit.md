# Filters coverage audit — sort EWP's ~25 rule-scoped filter fields by teaching priority

Type: research
Status: resolved

## Question

[Ticket 31](31-locations-research.md)'s research surfaced that `locations:`/`bannedLocations:` sits among roughly 25 sibling "Filters" fields in `docs/scripting.md` (`biomes:`/`bannedBiomes:`, `day:`/`night:`, `admin:`, `minX:`/`maxX:`/etc., `minAltitude:`/`maxAltitude:`, `minTerrainHeight:`/`maxTerrainHeight:`, `paint:`/`minPaint:`/`maxPaint:`, `environments:`/`bannedEnvironments:`, `globalKeys:`/`bannedGlobalKeys:`, `keys:`/`bannedKeys:`, `events:`/`eventDistance:`, `playerEvents:`/`bannedPlayerEvents:` (ruled out of scope separately, see the map's Out of scope), `groups:`/`bannedGroups:`) — and **none of them have any dedicated wiki coverage today**, not even ones likely used more than `locations:`.

Do for this whole category what the original bad-cop sweep (content-quality-pass ticket 05) did for content quality: read every one of these ~25 fields against real source (`docs/scripting.md`, EWP C# where the docs are thin), and sort them into a prioritized list — which are commonly-useful enough to earn a dedicated section/page, which are niche/advanced enough that a link to `docs/functions.md`/`docs/scripting.md` (per [ticket 24](24-reference-section-decision.md)'s decision) is sufficient, and which genuinely don't matter enough to act on at all (same treatment `playerEvents:` already got).

Source-verify each field's real behavior, not just its one-line doc description, per this repo's "never guess" standard — a field can look simple in `scripting.md`'s summary line and hide a real gotcha (as `locationDistance:`'s `exteriorRadius` default did). Don't write reader-facing content in this ticket — output is the prioritized list plus enough real-behavior notes that a future content ticket doesn't need to re-derive them.

## Notes

This is explicitly a sorting/triage pass, not a commitment to build 25 pages. Expect most fields to land in "link out, don't build" — that's a valid, useful outcome, not a failure of the audit. Flag any field where the real mechanics turn out to be non-obvious or commonly-confused (the way `locations:`/`maxDistance:` were) even if it doesn't end up ranked high enough for a dedicated page — a short note on an existing page's Aside can still be worth it without a full section.

## Answer

Sources read in full: `docs/scripting.md`'s "Filters" section (raw, lines 65–156 of the fetched file — every field below is quoted or paraphrased from there unless a C# citation is given); `PrefabData.cs` (field declarations + `ObjectData.IsValid`), `Paint.cs` (real per-vertex paint lookup), `HandleEvent.cs` (the `event` trigger patch — not the `events:` filter itself, noted below), `FilterShorthand.cs` (confirms `filter`/`bannedFilter` singular→list normalization only, unrelated to this field set). Wiki cross-check: `grep` across `ew_wiki/src/content/docs/ewp` for every field name — confirmed the ticket's premise, effectively **zero dedicated coverage**: `day:`/`night:` and `globalKeys:`/`keys:` get one passing mention each (in `advanced-triggers-time.mdx` and `ewp-key.mdx`'s comparison table, respectively); every other field — `biomes`, `paint`, `environments`, `events`, `groups`, the coordinate/altitude/terrain-height fields — has no mention anywhere.

One scope note: the ticket's field list omits `minDistance`/`maxDistance` (distance from world center), which sits in `scripting.md` right next to `minX`/`maxX` etc. Left out of this audit since it wasn't in the ticket's enumeration — flagging for the maintainer in case that was an oversight rather than deliberate. Also: there is no standalone `terrainHeight` field in EWP, only `minTerrainHeight`/`maxTerrainHeight` — the ticket title's "`terrainHeight`" singular doesn't exist as its own key.

### Tier A — dedicated section/page worthy

**`biomes:` / `bannedBiomes:`** — Almost certainly the single most-used filter in real scripts (most prefab rules are biome-scoped). `scripting.md` is already fairly detailed here, but the detail itself is the gotcha: biomes have base names and "alternate" names (e.g. `Kalhygge Black Forest`), a base biome's filter matches all its alternates, but `bannedBiomes` blocks on **any** matching alternate even when a different alternate also matches — asymmetric base/alt logic that's easy to get backwards. The only way to see real alternate names is the in-game `ewp_biomes` console command; translated map labels don't work. This combination (common field + genuinely tricky matching semantics + a console command readers won't know exists) clears the bar for a dedicated section, likely paired with or cross-linked from wherever `prefab:`/wildcards are taught.

**`paint:` / `minPaint:` / `maxPaint:`** — Source-verified via `Paint.cs`: at runtime this reads the actual compiled terrain paint at that world position (per-vertex, from the zone's `_TerrainCompiler` data) and falls back to the biome's default paint color only if no compiler object exists yet for that zone. `paint:` requires an **exact** color match (named color like `dirt`/`cultivated`/`paved_moss`, or literal `r,g,b,a`); `minPaint:`/`maxPaint:` instead do a **per-component threshold** check (each of r/g/b/a must be ≥/≤). That exact-vs-threshold split is a real, easy-to-miss trap for anyone writing a rule that should match "roughly this color" and reaches for `paint:` instead of `minPaint`/`maxPaint`. Relevant to any terraforming/building-detection rule (e.g. "only spawn on cultivated ground"). Worth a dedicated section, natural to place near/after a `terrain:` actions page if one exists.

**`events:` / `eventDistance:`** — The two fields have an asymmetric default relationship that's a genuine trap: set `events:` alone and the search radius silently defaults to 100m; set `eventDistance:` alone (no `events:`) and the filter accepts **any** nearby event, not "no events." Someone reasonably expecting `eventDistance:` alone to be inert (since normally an empty/unset companion field means "not checked" elsewhere in this filter set) will be surprised it does check something. Common enough (boss-fight / raid-scoped rules) and non-obvious enough to warrant a real section, not just a link.

### Tier B — link out to `docs/scripting.md` is enough, but flag an Aside on an existing page

- **`minAltitude:` / `maxAltitude:`** — `scripting.md` already states the gotcha itself ("Same as minY but checked against ocean level (y=30)"), so it's not hidden, just easy to skim past. A one-line Aside wherever `minY`/`maxY` are taught ("altitude ≠ raw Y — it's corrected against sea level at y=30") would stop readers reaching for `minAltitude` when they actually want raw `minY`, or vice versa.
- **`minTerrainHeight:` / `maxTerrainHeight:`** — Docs state "Terrain modifications are not included," i.e. these always read the *original*, pre-edit terrain height. Matters directly for any rule chain that both terraforms (`terrain:` action) and filters on terrain height — the filter won't see the rule's own changes. Worth an Aside next to any terraforming content.
- **`keys:` / `bannedKeys:`** (distinct from `globalKeys:`, already partly covered in `ewp-key.mdx`'s comparison table) — format is `key1 value1, key2 value2`, and values support a numeric range `min;max;step` (step defaults to 1). That range-value support is not obvious from the field name and is a genuinely useful, likely-undiscovered capability (e.g. matching a saved level/stage value falling in a band). Worth a short addition to `ewp-key.mdx` rather than a new page.
- **`groups:` / `bannedGroups:`** — Docs state plainly it "Requires using Server Devcommands mod or some other mod that provides group implementation." Without such a mod, this filter has no group data to check against and effectively never does what the field name suggests. A one-line caveat wherever `groups:` gets mentioned (even just in a Reference link-out) prevents the "I set groups: and it doesn't work" bug report.
- **`environments:` / `bannedEnvironments:`** — Structurally identical list-membership filter to `biomes:`/`bannedBiomes:` but without the alt-name/base-name complexity — no console-command-discoverable name list found in this repo, no non-obvious runtime gotcha turned up. Link-out is enough; no Aside needed.

### Tier C — genuinely low priority, link-out only, no Aside warranted

- **`day:` / `night:`** — Trivial boolean, already gets a passing correct mention in `advanced-triggers-time.mdx`. No further action needed.
- **`admin:`** — Trivial three-state boolean (true/false/unset), no hidden behavior found.
- **`minX:` / `maxX:` / `minZ:` / `maxZ:` / `minY:` / `maxY:`** — Plain coordinate box filter, self-explanatory, no gotcha found.

### Recommendation for the maintainer (not opened as tickets, per this ticket's instructions)

If greenlit, this audit suggests three follow-up content tickets, roughly in priority order:
1. A `biomes:`/`bannedBiomes:` filter section (base/alt matching semantics + `ewp_biomes` command).
2. A `paint:`/`minPaint:`/`maxPaint:` filter section (exact-vs-threshold distinction, real compiled-paint mechanic).
3. An `events:`/`eventDistance:` filter section (asymmetric-default trap).

Plus four small Aside additions bundled into whichever ticket next touches the relevant existing page: the `minAltitude`/`maxAltitude` sea-level note, the `minTerrainHeight`/`maxTerrainHeight` "ignores modifications" note, the `keys:`/`bannedKeys:` range-value note (on `ewp-key.mdx`), and the `groups:`/`bannedGroups:` external-mod-dependency note.
