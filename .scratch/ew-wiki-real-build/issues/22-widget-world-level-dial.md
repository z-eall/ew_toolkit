Type: task
Status: claimed
Blocked by: 21

## Question

Build the "world-level dial" interactive widget: one slider for the shared `bfvworldlevel` key that updates the real tables on all three pages together — `world-progression.mdx`, `auto-upgrade-station.mdx`, `village-cargo.mdx`.

Deliberately last: biggest lift of the six, and the only one touching multiple pages at once. Same spirit and construction pattern as `FilterLimitExplainer.astro` where it still applies, but the cross-page sync (one slider state driving three separate page tables) is new — decide during the prototype whether that means one shared component instantiated on each page with independent state, or a real cross-page sync mechanism, and confirm the `bfvworldlevel`-keyed table data on all three pages still matches [Extended Reading rework](14-extended-reading-rework.md)'s Answer before wiring the dial to it.

Process: prototype first via `ew_toolkit:prototype` — the cross-page question above makes this the least obvious of the six — then land the real component(s), wire into all three pages, and verify the build clean via `.scratch/ew-wiki-real-build/build-check.sh` (WSL only). Per the user's hard sequencing constraint, do not start this ticket until [Weight and Chance — run the lottery widget](21-widget-basic-rng-lottery.md) is fully built and build-verified.
