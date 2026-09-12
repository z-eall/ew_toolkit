Type: grilling
Status: resolved

## Question

Add 2 bad-cop (WRONG/CORRECT) examples, both on `advanced-poke-mechanics.mdx`, from the bad-cop sweep ([full report](../../../../research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md)):

1. A self-poke loop needs `delay:` or it can hammer the server every tick. Wrong pattern: a countdown/self-poke rule (`self: true`, no `delay:`) — fires unthrottled instead of once per second. The Creative-Systems page already states this as a hard rule in an Aside; no fenced contrast exists here.
2. `evaluate:` (default `true`) computes math-looking text inside a poke parameter. Wrong pattern: sending `parameter: message "Price: 5-2"` intending literal text, without `evaluate: false` — EWP may try to compute `5-2` instead of keeping the string as-is.

Follow the wiki's WRONG/CORRECT convention and the "Don't do this:" caution-Aside convention. Note: item 1 is a genuine crash/lag risk (matches the severity bar set on the Filter-by-Objects example) — the caution wording should say so plainly, not soften it into a style note.

## Answer

Both pairs added on `advanced-poke-mechanics.mdx`. Item 1's severity was corrected against `DelayedPoke.cs` source: a delayless self-poke doesn't "hammer the server every tick" (the original sweep wording) — `if (delay <= 0f)` runs the next poke synchronously, in the same call stack, so it's an instant infinite recursion that freezes/crashes, not gradual lag. Maintainer flagged the first caution draft as internal-facing (named the source file, hedged with "isn't spelled out in the mod's own docs") — rewritten to one plain sentence stating the crash risk as fact.
