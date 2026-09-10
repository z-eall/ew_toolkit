Type: task
Status: resolved
Blocked by: 19

## Question

Build the "peel the nesting" interactive widget for `advanced-functions.mdx`: a nested function call resolves one layer at a time, innermost first.

Same spirit and construction pattern as `FilterLimitExplainer.astro` — reuse that pattern. Pick the example nested call from the page's existing creative-combo content (per [Advanced Functions reframed as a creative-combo showcase](12-advanced-functions-reframe.md)) rather than inventing a new one, so the widget and the surrounding prose stay in sync.

Process: prototype first via `ew_toolkit:prototype` if the step-by-step peel animation/interaction isn't already obvious, then land the real Astro component, wire it into `advanced-functions.mdx`, and verify the build clean via `.scratch/ew-wiki-real-build/build-check.sh` (WSL only). Per the user's hard sequencing constraint, do not start this ticket until [type: change widget](19-widget-triggers-change.md) is fully built and build-verified.

## Answer

Picked `<max_0_<sub_20_<len_<par_1>>>>` (from the "Text-and-Numeric combo for a chat-submitted name" case study) as the nested call to peel — the only static/deterministic 3-layer nest on the page (the dice-roll example uses randomness, the nearest-gate example needs a live player position, so neither teaches cleanly with fixed steps).

One prototype round (`nesting-peel-widget-v1-prototype.html`, branch `prototype/nesting-peel-widget`) with a free-text name input and a Back/Next/Reset step control (reusing ticket 17's story-walkthrough pattern) that visibly shrinks the expression from the inside out as each layer resolves into a chip. Maintainer feedback: swap the free-text input for a fixed 3-scenario dropdown, show the chosen example name beside the dropdown (the `<select>` itself truncates), and tighten spacing to match the other widgets.

Built `NestingPeelExplainer.astro`, wired into `advanced-functions.mdx` right after the case study's own explanatory paragraph. Three scenarios, chosen to cover all three shapes the clamp can produce:
- "Ragnar" (6 chars) → budget 14 — plain, no clamp involved.
- "Bjorn Ironsideson II" (20 chars) → budget 0 exactly — at the limit, but not negative, so `<max_0_X>` doesn't actually change anything (a deliberately distinct case from the one below).
- "Ragnar the Unbroken of Northshire" (33 chars) → budget -13, clamped to 0 — the actual clamp firing.

Spacing mirrors `TriggerChangeExplainer.astro`'s numbers (12px horizontal / 6-8px vertical), the tightest existing widget, per the maintainer's note. Build verified clean via `build-check.sh` (33 pages) after clearing a stray leftover `astro dev` process from an earlier session (known WSL watcher issue, see `project_ew_wiki_astro_dev_stale_watcher` memory) — full kill + fresh restart, then curl-verified the served HTML contained the widget markup before checking the browser. All three scenarios exercised live (including the clamp-to-0 case) and confirmed working.

**Follow-up round 1**: dropped the "Example: ..." preview line the maintainer had asked for in round 1 as redundant once actually seen live (each dropdown option's own text already names the example, and none of the three truncate); switched the narration/result zones' reserved height from a hard `height` + `overflow:hidden` to `min-height` after a real mobile-viewport check (not just the desktop screenshot) caught it silently clipping the longest result sentence.

**Follow-up round 2**: maintainer reported Back sitting visibly higher than Next/Reset, and asked to drop Back/Next's arrow glyphs and the "Step X of 3" label entirely as noise. Root cause of the misalignment (confirmed via `getBoundingClientRect`, not guessed): Starlight's own global CSS was handing every non-first button a stray `margin-top: 16px` — the same recurring "stray margin from outside this component" bug already documented in `FilterLimitExplainer.astro` and `ObjectsNearbyExplainer.astro`. `margin: 0` on every control button fixed it outright; verified all three buttons now share one exact top position. Build re-verified clean via `build-check.sh` (33 pages) after another stray `astro dev` process from the same session had to be killed and restarted fresh.

**Follow-up round 3**: maintainer caught that swapping the free-text input for the dropdown (round 1 feedback) had silently regressed the unresolved `<len_X>` display from the validated prototype's behavior — it showed the literal placeholder `<par_1>` instead of the reader's actual chosen name. Restored it (`<max_0_<sub_20_<len_Ragnar>>>`), with a maintainer-specified rule for the long scenario: names over 20 chars shorten to "first ... last" inside the expression box only (`<len_Ragnar ... Northshire>`); Bjorn Ironsideson II (exactly 20) and Ragnar (6) always show in full; the narration/result text always keep the real, untruncated name regardless. Also caught and fixed a second latent clipping risk this created: `.np-zone-expr` had a hard `height`, and embedding the real name (versus the short generic placeholder) can now push the line to 2 lines at mobile width — switched to `min-height`, same floor-not-ceiling fix already applied to the narration/result zones in round 1. Verified live at both desktop and mobile width for all three scenarios; build re-verified clean, 33 pages.

Ticket fully closed — no further known gaps.
