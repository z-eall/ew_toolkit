Type: grilling
Status: resolved

## Question

Add 2 bad-cop (WRONG/CORRECT) examples, from the bad-cop sweep ([full report](../../../../research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md)):

1. **`custom-data.mdx`** — reading a custom flag needs a `=default` fallback the first time it might not exist yet. Wrong pattern: `command: s <int_customBoar>` with no fallback, run on an object that was never given that `data:` line. (Milder than the others — an unexpected/blank display, not a break — keep the caution wording proportional.)
2. **`ewp-key.mdx`** — `globalkey`, an EWP key, and per-object `data:` are three separate stores that share vocabulary and don't read each other. Wrong pattern: setting a value with `<save_raidRank_3>` (an EWP key) then trying to read it with `<globalkey_raidRank=0>` or gating a rule with `globalKeys: raidRank` — silently reads nothing, because that filter only sees vanilla `setkey`/`removekey` flags.

Follow the wiki's WRONG/CORRECT convention and the "Don't do this:" caution-Aside convention.

## Answer

Both pairs added. `custom-data.mdx` also picked up maintainer-requested terminology: the `=default` fallback is now also named "default" in prose, not just "fallback." `ewp-key.mdx` contrasts `<save_*>` (EWP key) against `<globalkey_*>`/`globalKeys:` (vanilla setkey store) as genuinely separate, non-reading stores.
