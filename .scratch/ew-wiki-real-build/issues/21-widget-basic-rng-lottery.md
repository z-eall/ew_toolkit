Type: task
Status: open
Blocked by: 20

## Question

Build the "run the lottery" interactive widget for `basic-rng.mdx`: the reader sets `weight:` numbers, rolls 100 times, and watches a live tally build.

Same spirit and construction pattern as `FilterLimitExplainer.astro` — reuse that pattern. Confirm the real weighted-roll formula against source before encoding it (per `ew_wiki/AGENTS.md`'s source-verify checklist) — don't assume a naive proportional-weight model without checking.

Process: prototype first via `ew_toolkit:prototype` if the live-tally interaction isn't already obvious, then land the real Astro component, wire it into `basic-rng.mdx`, and verify the build clean via `.scratch/ew-wiki-real-build/build-check.sh` (WSL only). Per the user's hard sequencing constraint, do not start this ticket until [Advanced Functions — peel the nesting widget](20-widget-advanced-functions-nesting.md) is fully built and build-verified.
