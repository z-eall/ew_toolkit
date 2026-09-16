Type: task
Status: closed
Claimed by: Claude (this session, 2026-09-16)

## Question

`ew_wiki/src/content/docs/ewp/concepts/basic-filter.mdx`'s shipped WRONG/CORRECT pair (added by ticket 06) is factually wrong, found while rechecking the sweep report in [ticket 14](14-recheck-sweep-report-claims.md). Live text currently reads:

```yaml
# WRONG — the comma gets folded into the value as the text "2,3", which isn't a number;
# the level check is then silently skipped, so this matches every Boar, not just 1-2 star ones
- prefab: Boar
  type: create
  filter: int, level, 2,3
  data: strongBoar
```

with a matching `<Aside type="caution">` claiming the comma "gets read as part of the value text itself."

This is false. `filter: int, level, 2,3` has 4 comma-separated parts, and 4 parts is a documented, supported format:

- `docs/scripting.md` lines 200-205 (JereKuusela/valheim-expand_world_prefabs): "Format for a single data value is `type, key, value, weight`, with weight being optional."
- `ExpandWorldPrefabs/PrefabData.cs`, `Filter` constructor: when `split.Count == 4`, `Weight = DataValue.Float(split[3])` and the filter is rejoined as `string.Join(",", split.Take(3))` — i.e. `"int,level,2"`.
- `ExpandWorldPrefabs/service/data/DataHelper.cs`, `Get(IStringValue?, Functions)`: splits that rejoined string with `dataStr.Split([','], 3)` → `["int","level","2"]`, recognizes `int` as a supported type, and builds a real `DataEntry(type: int, key: level, value: 2)`.

So the actual parse of `filter: int, level, 2,3` is **type=`int`, key=`level`, value=`2`, weight=`3`** — a working filter, not a broken one. It checks `level == 2` exactly (weight 3 is inconsequential here; default `filterLimit` is 1, and weight 3 still clears it). The real mistake the comma introduces is that it **silently drops the "or 3" half of the intended range** — the rule ends up matching only 1-star Boars, not 1-2 star — not that it "matches every Boar" or skips the check.

The semicolon side of the pair (`filter: int, level, 2;3` as CORRECT, a real range) is fine and doesn't need to change — only the WRONG example's code comment and the caution `<Aside>` text are wrong.

**Update (2026-09-14, maintainer-prompted re-verification)**: the maintainer pushed back on whether the `type,key,value,weight` 4-part format even applies to singular `filter:` at all — `docs/scripting.md`'s "Format for a single data value is `type, key, value, weight`" line sits under its "### Multiple filters" heading (about `filters:`/`bannedFilters:`, plural), while singular `filter:`/`bannedFilter:` gets its own separate "### Data filters" section documenting only the 3-part `type, key, value` format, no weight. Fair challenge — checked further and confirmed it mechanically does still apply: `ExpandWorldPrefabs/service/FilterShorthand.cs`'s `Normalize()` runs as a YAML pre-processing pass (before deserialization) that rewrites the key `filter`/`bannedFilter` → `filters`/`bannedFilters` and wraps the scalar value in a one-item list — so `filter: int, level, 2,3` is rewritten to `filters: [int, level, 2,3]` before it ever reaches the `Filters`/`Filter` C# classes. Singular `filter:` is syntactic sugar for a one-item `filters:` list, not a separate code path — the 4-part/weight parsing genuinely applies.

**But the maintainer's real point stands, and reshapes the fix**: with exactly one required filter and no `filterLimit:` override, the default limit equals the filter count (1) — so *any* positive weight, including the accidental `3`, clears that limit the same as the default weight of 1 would. The weight is real (mechanically) but **inert** in this singular-filter context — teaching "the 4th comma part becomes a weight" as the headline fact would itself plant a fog confusion, since it invites the reader to think weight is doing something observable here when it isn't.

**Fix needed, reframed**: lead the corrected explanation with the actionable lesson — **comma is not how you write "2 or 3"; EWP's own documented syntax for that is a semicolon (`2;3`), which is exactly what the page's own CORRECT example already shows.** The comma version doesn't error and doesn't match everything; it silently narrows the range to level 2 only (since the "3" gets absorbed as an inert weight rather than joining the value). State that mechanism in one plain sentence if it helps explain *why* the range narrows instead of erroring, but don't build the caution around "and by the way this sets a weight" as if it mattered — it doesn't, for this shape of filter, and saying so without that caveat is exactly the kind of technically-true-but-misleading wording this recheck pass exists to catch. Cite `docs/scripting.md`'s format line only if a source note is wanted (per house style, keep reader-facing text plain — no internal file/line citations in the prose itself, per `ew_wiki/AGENTS.md`).

Also double check `start-scripting.mdx` doesn't reference or depend on this same wrong wording (it has its own separate case-sensitivity WRONG/CORRECT pair from the same ticket 06, unrelated claim — should be unaffected, but worth a quick look while in the file).

## Answer

Fixed both the caution `<Aside>` and the WRONG comment on `basic-filter.mdx`. New wording leads with the actionable lesson (comma isn't how you write "2 or 3" — the real range separator is a semicolon) and states the real, correct consequence (the check quietly narrows to level 2 only) instead of the false "matches every Boar" claim. Mentioned the weight mechanism in one plain sentence without naming "weight" or citing file/line sources in the reader-facing text, per house style and per the ticket's own reframing — it's real but inert here, not worth building the caution around.

Checked `start-scripting.mdx`: its 2 WRONG/CORRECT pairs (case-sensitivity, duplicate `data:` keys) are unrelated and untouched.

Verified with a clean production build: 35 pages, no errors.
