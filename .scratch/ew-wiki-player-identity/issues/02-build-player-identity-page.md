# Build "Advanced Functions - Player Identity" page

Type: prototype
Status: resolved
Claimed by: Claude (this session, 2026-09-14)

## Question

Build the short primer page decided in [ticket 1](01-page-shape-and-placement.md): `Advanced Functions - Player Identity`, Advanced tier, last in the sidebar. Covers section 1 of the [research report](../../../research_reports/valheim-ewp-player-identity-ownership-2026-09-14.md) only — a short, general explanation of `pid`, `cid`, `platform`, `pname`, `pchar`, `pvisible` (what each returns, stability, real-world usage), leading into `pid`/`cid` as the two the reader needs to actually understand before the deeper `Object Ownership` page.

Must go through this map's standing prototype/signoff flow (see map Notes): build as `draft: true`, render in the dev server, get the maintainer's live signoff, only then wire into `astro.config.mjs`'s sidebar and drop `draft: true` — together, in one pass.

## Answer

Built and signed off. Covers `pid`/`cid` (the two focused on), `pname` (its own section, including a real `<par_X>`-vs-`<rest_X>` gotcha for multi-word character names — sourced from the real `BaseCampBed` production script's `<cid> <pname>` poke pattern), and a brief two-row table for `platform`/`pvisible`. `pchar` dropped entirely per the maintainer's call. Closes with a "Where this goes next" section previewing `Object Ownership` instead of repeating the same pointer twice.

Two real mistakes caught and fixed during review, both worth remembering:
1. A first draft of the `<par_X>`/`<rest_X>` example had two `data:` keys in one YAML mapping — invalid (duplicate keys silently keep only the last), which would have taught a broken pattern. Fixed by simplifying the example to the one field that mattered, cutting the unrelated ownerCID field entirely (maintainer's call — it was a distraction from the actual point).
2. The gotcha was first written as a plain "Watch out:" heading with prose — not this site's actual established bad-cop convention (`<Aside type="caution">Don't do this:</Aside>` + paired `# WRONG`/`# CORRECT` plain fences, per `ew_wiki/AGENTS.md`'s Component conventions). Rewritten to match.

Signed off, `draft: true` removed, and wired into `astro.config.mjs`'s Advanced sidebar list (last position) in the same pass. Build verified clean via WSL, 34 pages.
