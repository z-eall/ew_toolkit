# Reframe Advanced Functions as a creative-combo showcase

Type: task
Status: resolved
Blocked by: none (follows straight on from ticket 10)

## Question

Ticket 10 reordered Advanced Functions but kept its identity as "teach the categories functions.mdx didn't cover." This ticket changes that identity: once Custom data (global) (ticket 11) and Time functions (this ticket) both move to pages that fit them better, what's left on Advanced Functions should showcase Numeric/Text functions combined *creatively* — something functions.mdx never did (it only introduced them one at a time) — rather than teach a new category.

- **Time functions split by clock, not left whole**: `advanced-triggers-realtime.mdx` already fully teaches `<realtime>`/`<realtime_X>`/`<realtime_X_Y>` with better case studies than Advanced Functions has — delete the duplicate here, don't move it. `advanced-triggers-time.mdx` only touches `<day>` in passing — move `<time>`, `<ticks>`, `<time_X>`, and the countdown case study (`<max_0_<sub_30_<day>>>`) there for real. The existing `worldclock` example (`<day>` + `<realtime_HH:mm>` in one line) mixes both clocks and doesn't belong to either trigger page — keep it on Advanced Functions as the page's own cross-category example.
- **`<ticks>`**: Long numbers (staying on Advanced Functions) explains it needs the `long` variant for `<ticks>`-sized numbers — once `<ticks>` itself is introduced on `advanced-triggers-time.mdx`, link there instead of re-explaining it.
- **New showcase content, balanced Numeric and Text** (maintainer's call — Text has no real precedent anywhere in the repo's example material, unlike Numeric which has `EWP_Maths_Guide.md` to draw from, but both get a case study, not just Numeric).
- **Vector and Long numbers stay exactly as ticket 10 left them** — quick reference, not upgraded to the new showcase treatment.
- **Fix while here**: `advanced-triggers-realtime.mdx:55` still links to the old combined `key`/`globalkey` anchor from before ticket 11's split — broken now, needs repointing.
- Cross-check `functions.mdx`'s category summary (edited in ticket 10) and any other page linking to `advanced-functions/#time-functions` — both need updating once that heading moves.

## Answer

Moved game-clock functions (`<day>`, `<time>`, `<ticks>`, `<time_X>`) plus the countdown case study to `advanced-triggers-time.mdx`; deleted the realtime bullets/example from Advanced Functions entirely since `advanced-triggers-realtime.mdx` already taught them better (no content lost, just de-duplicated). Registered `EWP_Maths_Guide.md` in `docs/sources.md` (community tier) since it's now actually used as inspiration, not just sitting unreferenced.

Advanced Functions' intro and opening section reframed around a new "Combining functions across categories" heading with three original case studies:
- The old `worldclock` example (mixes game-clock + realtime), kept here since it doesn't belong to either single-clock trigger page.
- A new Text-and-Numeric combo (`<len_>`/`<upper_>` + `<sub_>`/`<max_>`) for a chat-submitted name's length budget — balances the Numeric-heavy examples elsewhere per the maintainer's call, honest that EWP has no string-trim function so it only reports the budget.
- A new Numeric-only weighted-roll example (`<add_<randi_>_<randi_>>>`), inspired by (not copied from) `EWP_Maths_Guide.md`'s weighted-random pattern, reskinned as a damage roll.

Vector and Long numbers untouched, per the maintainer's call to leave them as ticket 10's quick reference.

**Two more stale links found and fixed while verifying** (beyond the ones already known): `advanced-triggers-realtime.mdx:55` still pointed at the pre-ticket-11 combined `key`/`globalkey` anchor — repointed to the split `globalkey` heading. Also discovered the site's heading-to-anchor slugifier turns `"Case study - X"` (hyphen) into a **triple-hyphen** id (`case-study---x`) but `"Case study: X"` (colon) into a normal single-hyphen id — a real, silent gotcha worth remembering for any future cross-page anchor link on this wiki. Fixed the one link that got it wrong.

`functions.mdx`'s category summary updated again to reflect the time split (game-clock → type: time page, real-world-clock → type: realtime page) instead of pointing both at Advanced Functions.

Build verified clean via WSL: 31 pages, no errors. Visually verified all three touched pages in the dev preview (after a full server restart — WSL's file watcher still doesn't reliably pick up new/moved MDX from a Windows-side write, confirming this is a recurring, not one-off, quirk). One code block appeared visually blank in two consecutive browser-pane screenshots; DOM inspection (`innerHTML`/computed style) confirmed real, correctly colored content in all 5 code blocks on the page — a screenshot-tool paint artifact, not a site bug.

