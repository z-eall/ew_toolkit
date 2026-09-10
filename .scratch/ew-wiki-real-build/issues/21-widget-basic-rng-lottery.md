Type: task
Status: resolved
Blocked by: 20

## Question

Build the "run the lottery" interactive widget for `basic-rng.mdx`: the reader sets `weight:` numbers, rolls 100 times, and watches a live tally build.

Same spirit and construction pattern as `FilterLimitExplainer.astro` — reuse that pattern. Confirm the real weighted-roll formula against source before encoding it (per `ew_wiki/AGENTS.md`'s source-verify checklist) — don't assume a naive proportional-weight model without checking.

Process: prototype first via `ew_toolkit:prototype` if the live-tally interaction isn't already obvious, then land the real Astro component, wire it into `basic-rng.mdx`, and verify the build clean via `.scratch/ew-wiki-real-build/build-check.sh` (WSL only). Per the user's hard sequencing constraint, do not start this ticket until [Advanced Functions — peel the nesting widget](20-widget-advanced-functions-nesting.md) is fully built and build-verified.

## Answer

**Source-verified first.** Fetched `ExpandWorldPrefabs/InfoSelector.cs` (the mod's real C# source) directly and read `Randomize()`: total weight floors at `Mathf.Max(1, sum)`, then a uniform roll walks the list subtracting each weight until it drops to zero or below — the winner. This is exactly the naive proportional-weight model `basic-rng.mdx` already taught (step 3's competing-siblings split, step 5's "leftover space = nothing happens" gap) — confirmed, not assumed, per the source-verify checklist this ticket flagged.

**Prototype round.** Built `basic-rng-lottery-v1-prototype.html` on `prototype/basic-rng-lottery-widget`, reusing `FilterLimitExplainer.astro`'s "paste a real block, see it react" convention: a free-text `weight:` list textarea, a "Roll 100 times" button, and bars that filled in 5-roll batches with a tick mark for the theoretical share. Tested both a no-gap split (75/25) and the page's own under-1 gap example (30/20/50) — both tracked the confirmed math. Shown to the maintainer for go-ahead per the prototype-ticket HITL requirement.

**Maintainer feedback, applied directly to the real component (no separate round):**
- Reader only edits the weight numbers — the two option labels (Coins/Wood) and rule shape are fixed to the page's own step-5 example, not a free-text paste box.
- Button renamed "Roll 100 times" → "Roll"; the "Rolls so far: N / 100" counter line removed (the live-filling bars already show progress).
- Defaults changed to the page's own under-1 example (`0.3`/`0.2`, sum `0.5`) so the widget opens already showing the harder-to-intuit "nothing happened" gap case, not the simpler no-gap case.
- Roll/Reset moved into their own row below the tally card, not beside the weight inputs.
- Inputs card and tally card made equal-width grid columns; left grid-item stretch (default, not overridden) also equalizes their height, so the 2-row inputs card doesn't look like an accident next to the 3-row tally card — its rows are then vertically centered to fill that matched height cleanly.
- Both buttons share one `.wl-btn` class with an explicit shared width/height so "aligned" isn't left to chance.

**One real bug caught before calling it done:** the tally rows are built via `document.createElement` in the client `<script>`, so they never carry Astro's own scoping class — the first pass of CSS for `.wl-bar-row`/`.wl-bar-label`/etc. used plain (non-`:global`) selectors and silently never matched, rendering the label and percentages glued together with no layout or color. `FilterLimitExplainer.astro`'s own comments already flag this exact class of bug; missed it once here anyway before catching it live in the Browser pane and switching every JS-created-element rule to `:global(...)`. Also hit the known WSL `astro dev` stale-watcher issue mid-check — a plain reload kept serving the pre-fix CSS; a full `pkill -9 -f 'astro dev'` + confirm-zero + restart picked up the fix.

Verified live in the Browser pane: desktop (both the no-gap and under-1-gap cases, weight-input edits recomputing live, Reset restoring defaults), mobile width (375px — columns stack, Roll/Reset stay aligned, no clipping), and light theme (colors stay legible). Build verified clean via `build-check.sh`, 33 pages.

Real component: [`WeightLotteryExplainer.astro`](../../../ew_wiki/src/components/WeightLotteryExplainer.astro), wired into [`basic-rng.mdx`](../../../ew_wiki/src/content/docs/ewp/examples/basic-rng.mdx) right after step 5. No further known gaps.
