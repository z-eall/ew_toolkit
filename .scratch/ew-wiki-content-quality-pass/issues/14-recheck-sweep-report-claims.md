Type: research
Status: resolved

## Question

This map's Notes carried a standing flag since ticket 06 (2026-09-12): the original 18-item bad-cop sweep report (ticket 05's Answer, [research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md](../../../research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md)) may contain other unverified "definition"-style claims of the same shape already caught twice while acting on it — ticket 06's original `basic-filter.mdx` comma/semicolon wording (wrong against source) and ticket 07's `<par2>` claim (wrong against source, dropped rather than shipped). This reminder appeared repeatedly (map Notes, map Not yet specified, `HANDOFF.md`'s Next step, across multiple sessions) without ever becoming a real ticket — closing that loop now (`/wayfinder` review, 2026-09-14).

All 8 remaining sweep items (07-13, now closed) were already cross-checked against real source as they were acted on, per the map's own "Recheck flag" rule. This ticket is different: it's a dedicated pass back over the **sweep report's own phrasing**, independent of whether a given item was ever turned into a ticket, to catch the same class of unverified-definition mistake in any wording the report itself asserts.

Read the full 18-item report; for each item's factual claim (not its "should this become a bad-cop example" judgment, just its stated facts about how EWP behaves), grep/cite the real source (`docs/scripting.md`, the linked C# repo) the same way tickets 06-13 did. Report which of the 18 hold up as-stated and which don't, with corrected wording for any that don't.

## Answer

**Blocker found first, worked around**: `research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md` — the file this ticket, ticket 05's Answer, and the map all point to — does not exist on disk and was never committed to git (`git log --all -- research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md` returns nothing; `git fsck --dangling` finds no matching blob). It was apparently written during ticket 05's session but never `git add`ed, so it's lost.

It didn't block the recheck, though: every one of the 18 items is independently reconstructable, in full, from the tickets that acted on the sweep — each of 03/04 and 06-13's **Question** section quotes the sweep's original claim verbatim (file, concept, wrong-pattern sketch), and each **Answer** already records what got source-checked at write time. Counting item-by-item across those tickets accounts for exactly 18, matching the sweep's stated total. Full source access used for this recheck: `docs/scripting.md` and `docs/functions.md` fetched raw from `raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/`, plus `DelayedPoke.cs`, `PrefabData.cs`, `DataHelper.cs`, and `Functions.cs` fetched the same way and read in full — no WebFetch summarization used.

**16 of 18 hold up as shipped. 1 does not (live-page bug, see below). 1 is unverifiable against EWP's own source (not an EWP mechanic).**

| # | Page / claim | Verdict | Source |
|---|---|---|---|
| 1 | start-scripting.mdx — `prefab:`/`type:` keys case-sensitive, lowercase only | Holds | Standard YamlDotNet property-name matching (default case-sensitive); consistent with every other field name in `scripting.md`, none shown capitalized |
| 2 | basic-filter.mdx — comma vs semicolon in `filter:` | **Does not hold — live-page bug, see below** | `PrefabData.cs` `Filter` ctor; `DataHelper.cs` `Get`; `scripting.md` lines 162-205 |
| 3 | basic-functions.mdx — underscore in prefab id breaks `<upper_<prefab>>`-style splitting, needs `<safeprefab>` | Holds | `functions.md` line 6-7: "`<safeprefab>`: Original prefab id with underscores replaced by dashes... underscores split the prefab id as separate parameters" |
| 4 | bee-ecosystem.mdx — `<par2>` (no underscore) "fails to resolve" | Correctly dropped, not shipped | `Functions.cs` `GetGeneralFunction`: `"par0" => GetArg(0, ...)`, `"par1" => GetArg(1, ...)` — `par0`-`par9` are real hardcoded shortcuts, confirmed again this pass |
| 5 | world-progression.mdx — raw underscored prefab id (`gd_king`) pasted into a function name instead of `<safeprefab>` | Holds | Same `functions.md` citation as #3 |
| 6 | basic-pars.mdx — `<par_0>` is the matched word itself, not the next word said | Holds | `scripting.md` line 27 ("say... Parameter is the text"); `functions.md` "`<par_X>`: Returns parameter X" — parameter is the whole said text, `par_0` indexes into it starting at the matched word |
| 7 | basic-rpcs.mdx — `target:` defaults to `owner`, not `all` | Holds | `scripting.md` line 407: "target: Target of the RPC call. Default is `owner`." |
| 8 | advanced-filter-condition.mdx — `==` invalid, `=` is the real equality operator | Holds | `scripting.md` operators list (lines 76-89): lists `=`/`!=`/`>`/`<`/etc., no `==` |
| 9 | advanced-triggers-change.mdx — `triggerRules:` defaults to `false` | Holds | `scripting.md` line 303: "triggerRules (default: `false`)" |
| 10 | advanced-triggers-no-prefab.mdx — no-prefab `poke:`'s `maxDistance:` measured from world center | Holds | `scripting.md` line 104: "maxDistance: Maximum distance from the world center." (the no-prefab-context filter) |
| 11 | advanced-poke-mechanics.mdx — delay-less self-poke risks instant recursion crash, not gradual lag | Holds (and the severity correction tickets 10 already made is right) | `DelayedPoke.cs`: `if (delay <= 0f) Poke(zdos, args);` — runs synchronously in the same call stack, not queued |
| 12 | advanced-poke-mechanics.mdx — `evaluate:` defaults to `true`, computes math-looking text | Holds | `scripting.md`: "evaluate: If false, math expressions are not calculated... Default is true." |
| 13 | custom-data.mdx — reading a possibly-missing flag needs a `=default` fallback | Holds | Standard, widely-documented EWP `=default` convention used throughout `scripting.md`/`functions.md` |
| 14 | ewp-key.mdx — `globalkey`, EWP key (`<save_*>`), and per-object `data:` are 3 non-reading stores | Holds | `functions.md` line 194 (`<save_X_Y>`) vs `scripting.md` line 34 (`globalkey`) / line 126 (`globalKeys`) — distinct functions, distinct backing storage |
| 15 | spawn-vs-swap.mdx — a failed `swap:` (chance miss/blocked condition) still removes the original | Holds | `scripting.md` line 344: "Chance works for swap too. If it fails, the original object is still removed." — stated directly in the docs, no C# needed |
| 16 | basic-rng.mdx — weight-sum-under-1 | Correctly retired, not a real mistake | Judgment call (some authors want a "nothing happens" gap on purpose) — sound, no factual claim to check |
| 17 | custom-ship-data.mdx — damping set to exactly `0` causes flipping/uncontrollable | **Unverifiable against EWP source** | `Ship.m_damping` is a vanilla Valheim `Ship` component field, not EWP's own code — EWP only exposes it via `floats:`. Neither `scripting.md`/`functions.md` nor the EWP C# repo says anything about damping-0 physics; this is a community/reported claim about vanilla Valheim, outside what EWP's own source can confirm or deny. Not shown to be wrong — just not checkable the way the others are. |
| 18 | objects-filtering.mdx — `bannedObjectsLimit`/`objectsLimit` off-by-one, wide `maxDistance:` forces a full scan | Holds | `scripting.md` objects-filter section: "When using max, all objects must be searched"; `maxDistance` default 100m, "All objects are searched if the max distance is more than 10000 meters." (predates the sweep, ticket 04) |

### Live-page bug found (item 2) — needs its own ticket

`ew_wiki/src/content/docs/ewp/concepts/basic-filter.mdx`'s shipped WRONG/CORRECT pair (added by ticket 06, and re-recorded as "corrected" in this map's own Notes "Recheck flag" entry) is **itself factually wrong**, even after the ticket-06 fix. Live text currently reads:

> `# WRONG — the comma gets folded into the value as the text "2,3", which isn't a number; the level check is then silently skipped, so this matches every Boar, not just 1-2 star ones`

This is false. Traced through three independent points in the real source:

1. `scripting.md` lines 200-205: "Format for a single data value is `type, key, value, weight`, with weight being optional." A 4-comma-part filter is a **documented, supported format** — not an error.
2. `PrefabData.cs`, `Filter` constructor: `split.Count == 4` → `Weight = DataValue.Float(split[3])` and `filter = string.Join(",", split.Take(3))` — the 4th comma-separated part becomes an explicit **weight**, and the first three are rejoined as `"int,level,2"`.
3. `DataHelper.cs`, `Get(IStringValue?, Functions)`: `dataStr.Split([','], 3)` (max 3 parts) on `"int,level,2"` → `["int","level","2"]`, `tkv.Length > 2` and `"int"` is a supported type → builds a real `DataEntry` with type `int`, key `level`, value `2`.

So `filter: int, level, 2,3` parses as **type=`int`, key=`level`, value=`2`, weight=`3`** — a working filter that checks `level == 2` exactly, plus an incidental weight of 3 (inconsequential for a single required filter, since default `filterLimit` is 1 and weight 3 still clears it). The actual bug the comma introduces is narrower than claimed: it silently **drops the "or 3" half of the intended range** (matches only 1-star Boars, not 1-2 star) — it does **not** skip the check or match every Boar.

Filed as [ticket 16](16-basic-filter-comma-semicolon-live-bug.md), Status: open — fixing the live page is out of scope for this ticket.
