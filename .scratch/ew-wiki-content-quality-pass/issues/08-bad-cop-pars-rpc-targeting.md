Type: grilling
Status: resolved

## Question

Add 2 bad-cop (WRONG/CORRECT) examples, from the bad-cop sweep ([full report](../../../../research_reports/ew-wiki-bad-cop-sweep-2026-09-12.md)):

1. **`basic-pars.mdx`** — `<par_0>` is the matched trigger word itself, not the next word said. Wrong pattern: after `type: say, test1`, writing `command: s <par_0>` expecting it to shout whatever the player said *after* "test1" — it actually shouts "test1" back. `<par_1>` is the one that wants the next word.
2. **`basic-rpcs.mdx`** — `target:` defaults to `owner`, not `all`. Wrong pattern: a `clientRpc:` banner meant for the whole server, written with no `target:` field — only the triggering player ever sees it, no error.

Follow the wiki's WRONG/CORRECT convention and the "Don't do this:" caution-Aside convention.

## Answer

Both pairs added as scoped: `basic-pars.mdx` contrasts `<par_0>` (the matched word) vs `<par_1>` (the next word); `basic-rpcs.mdx` contrasts an unset `target:` (defaults to `owner`, confirmed from `scripting.md` line 407) vs explicit `target: all`.
