# Port the 6 fundamental + basic-use-case guides

Type: task
Status: resolved
Blocked by: none (was 06 — swapped, see 06's note)

## Question

Port the 6 already content-reviewed guide files into real Concepts/Recipes pages, applying house style (05):

- Theory Fundamental: `EWP_Understanding_Fields.md`, `EWP_How_To_Use_Data.md`
- Basic Use Cases: `EWP_Basic_Poke_Guide.md`, `EWP_Guide_to_PARS.md`, `EWP_Type_Time_Guide.md`, `EWP_Type_Realtime_Guide.md`

Source: `C:\Users\Ultimate\Claude\ew_toolkit_wiki_prototype\guide-reference\`. Advanced Use Cases guides are explicitly **not** part of this ticket — phase 2, tracked in the map's Not yet specified.

Fold in relevant findings from the three content-review reports per file (each report already flags what needs fixing, not just style notes).

**Note found while re-scoping (see map's Decisions-so-far):** 2 of the 6 — `EWP_Understanding_Fields.md` and `EWP_How_To_Use_Data.md` — are already ported, as `fields.mdx` and `data.mdx` (ticket 04). Only the 4 Basic Use Cases guides remain unstarted. Also: `guide-source/4-script-examples/` now holds real maintainer-supplied worked examples (beginner/intermediate/advanced), not part of the original 6-guide scope — candidate Recipe-section content, see the topic list under discussion before drafting starts.

## Answer

Re-scoped before drafting, same lens as the earlier advanced-guides check: read each of the 4 remaining source files line-by-line against the current live site rather than assuming a blank port was still needed.

- `EWP_Basic_Poke_Guide.md` → fully covered by `basic-poke.mdx` (minimal example, `data:`-as-filter/`filter:` alias, indentation pitfalls, mismatched-parameter and no-receiver failure modes, `delay:` mention, pointer to the Advanced Poke pages).
- `EWP_Guide_to_PARS.md` (Part 1, the only part the author wrote) → fully covered by `basic-pars.mdx` (`<par_X>`/`<rest_X>`, the `type: change` par order, saving a par into `data:`). The page also corrects the source's 0-vs-1 indexing claim against verified behavior rather than repeating it.
- `EWP_Type_Realtime_Guide.md` → fully covered by `advanced-triggers-realtime.mdx` (all 4 granularities, the 3 `<realtime_X>` functions, the weekday-buff pattern, the leap-year caution).
- `EWP_Type_Time_Guide.md` → the 4 granularities, the time table, and the double-yield-day pattern are covered by `advanced-triggers-time.mdx`. Two composite worked examples (an online-time coin-reward system, a total-playtime tracker) were not carried over as their own examples — checked whether the *techniques* inside them exist elsewhere first: save/load values (`ewp-key.mdx`), RPC-into-inventory (`advanced-rpcs.mdx`), delay-loop self-poking (`advanced-poke-creative-systems.mdx`), and `bannedGlobalKeys`/`bannedObjects`/`fallback` (multiple pages). All four are already taught, several with tighter, source-verified explanations than the original guide had. Nothing left unique to those two examples worth a new page.

No page edits were needed — the port is already done, just never credited. Fixed that: added all 4 source guides to `docs/sources.md` (plus the 2 already-confirmed-but-uncredited advanced-guide sources flagged in the last housekeeping handoff — `EWP_Ship_Modification_Guide.md` and `EWP_Advanced_Poke_Guide.md` — same gap, same fix, done in the same pass).

Closing with no content changes; only `docs/sources.md` changed.
