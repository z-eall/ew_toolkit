Type: task
Status: open
Blocked by: 19

## Question

Build the "peel the nesting" interactive widget for `advanced-functions.mdx`: a nested function call resolves one layer at a time, innermost first.

Same spirit and construction pattern as `FilterLimitExplainer.astro` — reuse that pattern. Pick the example nested call from the page's existing creative-combo content (per [Advanced Functions reframed as a creative-combo showcase](12-advanced-functions-reframe.md)) rather than inventing a new one, so the widget and the surrounding prose stay in sync.

Process: prototype first via `ew_toolkit:prototype` if the step-by-step peel animation/interaction isn't already obvious, then land the real Astro component, wire it into `advanced-functions.mdx`, and verify the build clean via `.scratch/ew-wiki-real-build/build-check.sh` (WSL only). Per the user's hard sequencing constraint, do not start this ticket until [type: change widget](19-widget-triggers-change.md) is fully built and build-verified.
