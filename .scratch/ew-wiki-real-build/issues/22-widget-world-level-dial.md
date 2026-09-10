Type: task
Status: resolved
Blocked by: 21

## Question

Build the "world-level dial" interactive widget: one slider for the shared `bfvworldlevel` key that updates the real tables on all three pages together — `world-progression.mdx`, `auto-upgrade-station.mdx`, `village-cargo.mdx`.

Deliberately last: biggest lift of the six, and the only one touching multiple pages at once. Same spirit and construction pattern as `FilterLimitExplainer.astro` where it still applies, but the cross-page sync (one slider state driving three separate page tables) is new — decide during the prototype whether that means one shared component instantiated on each page with independent state, or a real cross-page sync mechanism, and confirm the `bfvworldlevel`-keyed table data on all three pages still matches [Extended Reading rework](14-extended-reading-rework.md)'s Answer before wiring the dial to it.

Process: prototype first via `ew_toolkit:prototype` — the cross-page question above makes this the least obvious of the six — then land the real component(s), wire into all three pages, and verify the build clean via `.scratch/ew-wiki-real-build/build-check.sh` (WSL only). Per the user's hard sequencing constraint, do not start this ticket until [Weight and Chance — run the lottery widget](21-widget-basic-rng-lottery.md) is fully built and build-verified.

## Answer

**Resolved the cross-page-sync fork with the maintainer before prototyping**, since neither option the ticket named (independent state per page, or a real persistence mechanism like localStorage) was clearly right on its own — raised via `AskUserQuestion`, recommending localStorage persistence. The maintainer instead proposed a third option: **one widget, 3 tabs** (Boss Progression / Auto-upgrade Stations / Village Cargo) sharing a single 0–8 `bfvworldlevel` slider, the same component dropped into all 3 pages via one shared snippet — no navigation needed to see all 3 systems react to the same number, and no persistence-can-silently-reset edge case. Confirmed this was better than the original two options and prototyped it.

**Table data confirmed against the 3 real pages** (`world-progression.mdx`, `auto-upgrade-station.mdx`, `village-cargo.mdx`) before encoding, per [Extended Reading rework](14-extended-reading-rework.md)'s existing tables — boss-tier map (1–7, one per real boss), the 7-tier station/feast tables, and the village/cargo table (max at level 6). Slider range is 0–8: boss tiers only go to 7 (one per real boss, so 8 is a genuine no-boss-can-reach-it overflow), while the station/feast and cargo tables both cap at 6, so 7–8 fall back to that same max tier.

**Prototype round.** Built `world-level-dial-v1-prototype.html` on `prototype/world-level-dial-widget`, reusing `WeightLotteryExplainer.astro`'s single-card-with-tabs convention. Proved the "each page's copy opens on its own tab" requirement is feasible (via a `?page=` query-param stand-in for what became a simple Astro prop) and exercised all 3 tabs plus the slider live. Shown to the maintainer for go-ahead.

**Maintainer feedback, applied directly to the real component (no separate round):**
- Boss Progression tab: level 8 (the overflow tier no boss can reach) gets a pill tag reading "fallback" in a distinct color from the green "reached" tag, not just a plain highlight.
- Auto-upgrade Stations tab: the same "fallback" pill and row highlight now also fires at levels 7–8, landing on tier 6's row (the real table's own max tier) — previously those levels showed no highlight or tag at all.

Both use a new `--wld-fallback` amber accent (separate from the existing green "current/reached" accent), confirmed legible in both dark and light themes.

**Same known-bug guard applied from round one:** every table row/tag this widget renders is built via `el.innerHTML = "..."` in the client `<script>`, so none of it carries Astro's own scoping class — every such CSS rule is wrapped in `:global(...)` from the start this time, rather than being caught after the fact.

Verified live in the Browser pane: all 3 real pages open the widget on their own matching tab (Boss Progression / Auto-upgrade Stations / Village Cargo), the slider drives all 3 tables' highlight state correctly including both new fallback cases (levels 7 and 8), mobile width (375px — tabs wrap, no clipping), and light theme (fallback pill and row tint stay legible). Build verified clean via `build-check.sh`, 33 pages.

Real component: [`WorldLevelDialExplainer.astro`](../../../ew_wiki/src/components/WorldLevelDialExplainer.astro), wired into [`world-progression.mdx`](../../../ew_wiki/src/content/docs/ewp/examples/world-progression.mdx), [`auto-upgrade-station.mdx`](../../../ew_wiki/src/content/docs/ewp/examples/auto-upgrade-station.mdx), and [`village-cargo.mdx`](../../../ew_wiki/src/content/docs/ewp/examples/village-cargo.mdx), each right after its own "Part of a bigger system" tip.

This closes the interactive-widget phase (tickets 17–22) — no further widget ticket remains on this map.

## Follow-up round 2: 3-column tables, drop the feast section

Maintainer feedback after the first live pass: each tab's result table only filled about half the box left-to-right (browser auto-sizing columns to their content instead of the box's full width), and asked for the columns to line up with the 3 tab buttons above instead. Clarified via `AskUserQuestion` that this meant column *widths*, not a row-layout change — my first guess (a "previous/current/next" 3-card layout) was wrong.

Applied `table-layout: fixed` plus explicit width classes (`wld-col-1of3` = 33.3%, `wld-col-2of3` = 66.7%) to every result table, so column boundaries now match the 3 buttons' own equal thirds instead of bunching to whatever width the content happened to need. Auto-upgrade Stations only has 2 real columns ("Requires level" / "Unlocked pieces"); rather than leave a blank middle column to force 3, split it 1/3 + 2/3 so column 1 matches button 1's width and column 2 spans buttons 2+3's combined width — maintainer explicitly invited an alternative here rather than a literal col-1/col-3 split.

Also dropped the Auto-upgrade Stations tab's feast-table section (Base Camp Feast / Command House Feast) entirely per feedback — not important for this dial demo; the real page still covers it in prose.

Verified live: all 3 tabs' table columns now line up with the tab buttons and fill the box edge to edge, mobile width (375px) still stacks/wraps cleanly with the same column proportions. Build verified clean, 33 pages.
