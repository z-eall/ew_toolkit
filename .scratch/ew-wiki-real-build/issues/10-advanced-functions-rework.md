# Rework Advanced Functions with case studies

Type: task
Status: resolved
Blocked by: none (coordinate with 11 — see Question)

## Question

Rework `advanced-functions.mdx`:

- **Vector and Long numbers**: shrink to short reference sections, moved to the bottom of the page. Low priority — rarely used. No case study needed for these two; the existing short rule-list treatment is enough.
- **Time**: the one category that gets a genuine case study in this ticket, since it stays on this page — a small self-contained example nesting a Time function inside a Numeric one (playground-safe: no cross-rule state).
- **Custom data (global): left untouched in this ticket.** Its full `<save_X_Y>`/`<load_X>`/`<clear_X>`/`save++`/`save--` teaching stays exactly where it is for now — moving or shrinking it before the new "Custom Data: Advanced EWP Key" page (ticket 11) actually exists would leave a link to nothing. Ticket 11 does the extraction once its page is live and shrinks this section down to a short pointer, same pattern `custom-data.mdx` already uses today ("What this page doesn't cover"). Either ticket can land first; ticket 11 owns the actual cutover either way.
- **Inspiration isn't limited to what's already built.** `ew_wiki/docs/guide-source/3-advanced-guide/EWP_Maths_Guide.md` (DhakhaR's Discord "Maths with EWP" guide, community-tier, not yet ported) has real patterns worth drawing on for original examples: a toggle stored in a global key (`exec: <save_testkey_<abs_<sub_<load_testkey=0>_1>>>`), weighted-random/advantage-rolling via `<max_`/`<min_` on two rolls, and a Pythagoras distance-finder. Better fits for ticket 11 or a future page than for the Time case study here, but keep them in mind. Treat the file as raw inspiration, not something to excerpt verbatim — and if a fact or pattern from it lands in a page, add it to `docs/sources.md` first (it isn't listed there yet, only its sibling `EWP_How_To_Use_Data.md` is).

Apply house style (05) throughout.

## Answer

Reordered `advanced-functions.mdx` to Time → Custom data (global) → Vector → Long numbers. Time now leads (most commonly used of the four) and gained a new case study — `<max_0_<sub_30_<day>>>`, a clamped event countdown — nesting a Time function inside a Numeric one, self-contained so it stays playground-safe. Custom data (global) is untouched, left in place for ticket 11 to extract; added one forward-pointing `<Aside>` there linking to the future `/ew_wiki/ewp/concepts/advanced-ewp-key/` page (**dead link until ticket 11 lands** — known, not an oversight). Vector and Long numbers each got a one-line "used less often, kept brief" note and moved to the bottom, content otherwise unchanged. Build verified clean via WSL (`node -v` → v22.23.2, `npm run build` → 30 pages, no errors).

Note for whoever picks up ticket 11: this ticket did **not** touch `advanced-triggers-no-prefab.mdx`'s `key`/`globalkey` split — that's still ticket 11's to do, per its own Question.

