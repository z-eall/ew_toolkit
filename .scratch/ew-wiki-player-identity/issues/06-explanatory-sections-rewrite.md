# Rewrite explanatory sections: reader-friendly tone + reorder to the top

Type: prototype
Status: closed
Claimed by: Claude (this session, 2026-09-15)
Blocked by: (none — [ticket 05](05-creation-time-ownership-rule.md) closed)
Parent: [Player Identity & Object Ownership map](../map.md)

## Question

Two fixes to the page's explanatory sections (the Note aside, "The Claiming Player", "The Zone Host", "Effects (FX)", and the closing "`<pid>` at creation vs. later" / key-namespace / `admin:` sections) — not the object-by-object appendix, which is out of scope here (see the [object-chunk tickets](03-build-object-ownership-page.md)):

1. **Sweep for internal/research-facing language and rewrite reader-friendly.** Flagged examples: "checked directly against Valheim's own decompiled game code... full source citations live in this project's own code-proof ledger" (reads like an audit note, not a lesson); "A broadcast spawn (`ZNetView.Everybody`) — every connected client in range runs the spawning code independently... Not ambiguous — deterministic: N clients nearby produces N independently-owned copies" (internal engine vocabulary, not how a modder thinks about it). The ledger citation belongs in the ledger, not the page — if the page needs to gesture at "this is verified," do it once, briefly, in plain words, not by naming internal artifacts.
2. **Reorder**: move every explanatory section above the object-by-object appendix (the appendix becomes the last section on the page, per the maintainer's explicit instruction — it currently sits in the middle).
3. **Drop-in the locked text from ticket 05** for "The Zone Host" and "The Claiming Player" — wording is final, don't reword it further without a new grilling round. There is no separate "Creator" section; the old page's third rule was wrong (see ticket 05's Answer for why) — the two-rule text already covers the building exception in one sentence.
4. **Decide where `<long_creator>`/`<long_owner>` goes.** Ticket 05 drafted, then explicitly cut, a closing section pairing these permanent fields with the ownership-moves story — that idea is undecided, not rejected. Options: keep it as its own closing section (current page order, low-risk); fold it into "The Zone Host" section right after the building exception (tighter pairing, since both are about what happens at that same building moment); or something else. Pick one, note why, show the maintainer.

Build as `draft: true` (already is), show the maintainer the real rendered section order and prose, get signoff on this piece alone before any object-chunk ticket starts.

**Mid-session scope changes (2026-09-15, maintainer-directed), already applied to the live page:**
- Top `<Aside type="note">` removed entirely — replaced by two short plain paragraphs (no box), trimmed to just what `pid`/`cid`/"ownership" mean.
- Zone Host's caution Aside rewritten shorter, with an external link ([Valheim Fandom: Zones](https://valheim.fandom.com/wiki/Zones)) instead of restating proximity detail in-page.
- "One thing that's permanent, even though ownership isn't" (`<long_creator>`/`<long_owner>`) — removed entirely, not deferred. This was the placement decision item 4 above asked about; the maintainer's answer was "cut it," not "relocate it."
- "The `<pid>`/`<cid>`-as-key-namespace trick" and "One more thing worth knowing: `admin:`" — removed entirely.
- "Effects (FX)" — carved out to its own ticket, [ticket 13](13-fx-object-rule.md), to become an appendix-style object-rule entry instead of prose here.

Page is now just: intro → Zone Host (+ caution) → Claiming Player → appendix. Much leaner than originally scoped.

## Answer

**Signed off.** Final shape of the page's top section, in order:

1. Intro paragraph (no box) — what `pid`/`cid` report, one sentence bolded for the key point.
2. `<Aside type="note">` — one-line definition of "ownership."
3. `## There are two ways ownership can change:` (real heading, back in the page's own TOC after a round-trip — first tried as plain text inside a `<Steps>` block with no heading, which silently dropped it from navigation; restored as a heading wrapping the `<Steps>` block instead).
4. `<Steps>` block: step 1 is **The Zone Host** (the fallback rule + the one-sentence building exception + its own caution aside, now linking out to the [Valheim Fandom Zones page](https://valheim.fandom.com/wiki/Zones) instead of restating proximity detail in-page); step 2 is **The Claiming Player** (the repeatable-interaction bonus rule). Each step's title is its own line, separated from the body paragraph. Light bold/italic touches added across both steps for scannability (`**does this object have an owner?**`, `**There's one exception:**`, `**immediate ownership**`, `*Claiming Player*` cross-reference, `*"intercept"*`, `**hands ownership straight to whoever just did it**`) — kept sparse on purpose, not a bold-every-phrase pass.
5. `## Every object, its own script — grouped by component` (the appendix) — immediately follows, nothing else between it and the two-rule Steps block.

**Item 4 from the original Question (`<long_creator>`/`<long_owner>` placement) resolved as: cut, not relocated** — the maintainer's call once they saw the drafted-then-cut version during ticket 05, confirmed again this ticket. Not fog, not deferred — a real scope decision, done.

**Beyond the original Question's 4 items, this ticket also absorbed 3 rounds of maintainer-directed mid-session changes** (already logged in this ticket's body above): the top Aside note's content rewritten and repositioned, "Effects (FX)" carved out to its own ticket ([ticket 13](13-fx-object-rule.md)) rather than staying as prose here, and two rounds of formatting polish (the Steps/heading fix, then light bold/italic emphasis).

**A recurring operational problem surfaced across this ticket, worth carrying forward**: the WSL dev server's file-watcher does not reliably pick up edits made from the Windows side — `astro dev` kept serving stale content after edits landed on disk, even though the file itself was correct, and a `preview_start` "success" sometimes pointed at an already-dead ghost process. Every real content change this ticket required a full server kill (`pkill -9 -f 'astro dev'` inside WSL) and restart, not a reload, to actually show up. This is worth a standing note somewhere more permanent — see Check reach below.

**Check reach**: the dev-server staleness bug isn't specific to this page or this map — any future `ew_wiki` content session on this WSL setup will hit it. That's a process fact the codebase's own instructions should carry, not just this ticket. Proposing to add a short note to `ew_wiki/AGENTS.md` (near wherever the WSL-only toolchain is already documented) saying: after editing page content, restart the dev server (kill the WSL `astro dev` process, then `preview_start` again) rather than trusting a reload or HMR — will draft this via `/writing-for-agents` and confirm with the maintainer before writing it, as a small follow-up, not blocking ticket 07.
