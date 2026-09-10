# New page: Custom Data: Advanced EWP Key

Type: task
Status: resolved
Blocked by: none (coordinate with 10 — see Question)

## Question

Write a new page, **"Custom Data: Advanced EWP Key"** — successor to `custom-data.mdx` ("Custom Data: Your Own Flags"), same naming pattern. Covers the global store today split across `advanced-functions.mdx`'s "Custom data (global)" section and `type: key`'s own explanation on `advanced-triggers-no-prefab.mdx`.

Content, in order:

1. **What an EWP key is and how it works.** The mod's own docs call this "global custom data" — most players call it an EWP key. One shared slot, not tied to any object, set with `<save_X_Y>`, read with `<load_X=default>`, removed with `<clear_X>`, bumped with `save++`/`save--`.
2. **Why it's convenient next to `globalkey`.** `globalkey` is vanilla Valheim's on/off world flag (`setkey`/`removekey`) — it can't carry a real value, only "set or not." An EWP key can hold a number, text, or a position — same storage shape as per-object `data:`, just not tied to an object. Frame this as two different tools for two different jobs, not two flavors of one thing — matches how `advanced-triggers-no-prefab.mdx` already frames `key` vs. `globalkey` today.
3. **Each function, explained properly** — `<save_X_Y>`, `<load_X=default>`, `<clear_X>` (including the asymmetric wildcard behavior: `<save_*_Y>`'s wildcard only touches existing keys, `<clear_*>`'s doesn't), `<save++_X>`/`<save--_X>`, and `exec:` itself as the field that runs a function and discards its result.
4. **Reacting to a key change** — a short section teaching `type: key` from the data-lifecycle angle (set → read → react, all three in one place). Keep it short; the full "no-prefab" trigger mechanics (why `filter:`/`objects:` don't apply, `poke:` distance from world center, etc.) stay on `advanced-triggers-no-prefab.mdx`, not duplicated here — this page's section just needs enough to complete the story and links back for the mechanics.
5. **Simple use case**, then **advanced use case** — both original examples, inspired by (not copied from) the maintainer's `world-bosses.mdx`/`village-economy.mdx` world-level pattern and `EWP_Maths_Guide.md`'s toggle-key and `type: key` + `poke` "team bell" pattern (see ticket 10's note on that source file — same sourcing caveat applies here).

**Coordinate with ticket 10**: once this page exists, `advanced-functions.mdx`'s "Custom data (global)" section shrinks to a short pointer + link here.

**Coordinate with `advanced-triggers-no-prefab.mdx`** (not a separate ticket, a same-session edit when this page is drafted): split its combined "`key` and `globalkey`: reacting to a stored flag being set" heading into two distinct subsections — shrink `key`'s own part down to the no-prefab mechanics only, and link it here for the fuller combined story. Don't merge `key` and `globalkey` under one heading there anymore.

**If content runs long**: split into two pages the way `advanced-poke-mechanics.mdx`/`advanced-poke-creative-systems.mdx` did (mechanics vs. worked examples) — decide at draft time, not now.

## Answer

Built `ewp/concepts/advanced-ewp-key.mdx` ("Custom Data: Advanced EWP Key"), registered in `astro.config.mjs`'s Advanced sidebar group right after `advanced-functions`. Covers: what an EWP key is vs. per-object `data:`; a comparison table against vanilla `globalkey` (can't hold a real value vs. can hold a number/text/position); `exec:`/`<save_X_Y>`/`<save++_X>`/`<clear_X>`; `<load_X>`; a short `type: key` section (mechanics stay on the no-prefab page, linked both ways); a simple use case (`<save++_helloCount>`/`<load_helloCount>` counting greetings); and an advanced use case (a boar-cull bounty: `type: destroy` increments an EWP key, `type: key` announces it, a daily `type: time, day` rule halves it via `<floor_<div_<load_...>_2>>>` instead of resetting to zero — three trigger types and a three-deep nested function, none of it copied from `world-bosses.mdx`/`village-economy.mdx`, all facts reused from already-verified prefabs/fields elsewhere on this wiki).

Coordination completed as part of this ticket:
- `advanced-functions.mdx`'s Custom data (global) section shrunk to a short pointer here (was left untouched by ticket 10 on purpose, for this reason).
- `functions.mdx`'s category summary updated to point Custom data (global) at this page instead of Advanced Functions.
- `advanced-triggers-no-prefab.mdx` split its combined "`key` and `globalkey`" heading into two: `globalkey` keeps its full mechanics and both existing case studies; `key` shrunk to a short section with a link here for the fuller story. The generic "poking a real object from a no-prefab trigger" case study (not `key`/`globalkey`-specific) was promoted back to a page-level heading so it no longer reads as `globalkey`-only.
- Fixed 4 stale links in `village-economy.mdx`/`world-bosses.mdx` that pointed at the old `#custom-data-global` anchor (now gone from Advanced Functions) — repointed to this page.

Build verified clean via WSL: 31 pages, no errors.

**Renamed post-hoc**: title shortened to "Custom Data: EWP Key" (sidebar/page title kept the "Custom Data:" prefix, dropped "Advanced"), file/slug renamed `advanced-ewp-key.mdx`/`advanced-ewp-key` → `ewp-key.mdx`/`ewp/concepts/ewp-key/`. All site cross-links updated (`advanced-functions.mdx`, `functions.mdx`, `advanced-triggers-no-prefab.mdx`, `village-economy.mdx` ×2, `world-bosses.mdx`); `astro.config.mjs` sidebar entry and `docs/sources.md` updated too. Build re-verified clean.

