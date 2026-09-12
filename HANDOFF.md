# Handoff

Last updated: 2026-09-12, after committing the backlog below plus a new content-quality pass on `ew_wiki`.

## Where things stand

Committed today, two commits: (1) the nav-bar/favicon/header-TOC backlog (tickets 21, 22, 23 — see below for detail), (2) the [Ew Wiki Content Quality Pass](.scratch/ew-wiki-content-quality-pass/map.md) map — 3 wording fixes, new teaching content (`#comment` syntax, YAML editor tiers, a purpose-header-comment convention retrofitted onto 6 chained examples), 2 bad-cop examples plus a sweep finding 18 more candidate spots (not yet acted on — see that map's "Not yet specified"), and a new `ew_wiki/AGENTS.md` rule + `guard-script-block-header-comment.cjs` hook. Production build verified clean, 33 pages.

Prior narrative on the backlog commit (ticket 23 round 7.5 wrap-up):

Ticket 23 (`ew_wiki` header/TOC layout) has gone through 7.5 rounds today — see the ticket file for the full detail on each. Round 6 checked mobile width (375px) and fixed 2 real overlap bugs there. Round 7: the maintainer caught the theme toggle rendering as a colorful emoji on ew_wiki vs. a plain symbol on landing/validator — root cause was `shared/theme.css`'s `.theme-toggle` rule inheriting `font-family` from whichever host page it's dropped into; fixed by pinning `font-family` explicitly on `.site-nav` as a whole. Round 7.5: checking landing/validator as asked (not just re-trusting the round-7 close-out) found that fix hadn't actually reached the button on landing — `<button>` elements never inherit `font-family` from ancestors by default in any browser, so the pin on `.site-nav` (a `<div>`) never reached its child button; `ew_wiki` and `ewp_validator` only "verified fine" in round 7 because each happens to carry its own separate button-font reset that landing doesn't have. Fixed by restoring an explicit `font-family: inherit` on `.theme-toggle` itself, on top of the bar-level pin.

**Ticket 23 has no more known open issues** as of round 7.5 — see the ticket file for the full verification detail on every round, including the live re-check across all 3 pages (identical 53px nav height, identical computed button font, zero console errors on landing/validator/wiki).

**New hub-level hook**: `guard-shared-verify-all-tools.cjs` (`.agents/hooks/ew_toolkit/`, wired in both `settings.json` files as `PostToolUse` on `Edit|Write`). Fires whenever a `shared/` file changes, reminding to verify computed styles live on all 3 Tools before calling the change done — the trigger (a file path under `shared/`) is mechanical, so per `docs/agents/hooks-vs-rules.md`'s test it earned a hook, not just a memory. Smoke-tested (fires on a `shared/` path in either worktree, silent on unrelated paths) before wiring. Also added a one-sentence cross-reference in `AGENTS.md`'s "Shared visual identity" mechanism pointing at it, and logged the hook's own entry in `docs/agents/hooks-vs-rules.md`.

The `ew_wiki` interactive-widget phase (tickets 17-22 on the [Ew Wiki Real Build map](.scratch/ew-wiki-real-build/map.md)) is otherwise closed. Lessons from that phase live in [ew_wiki/docs/widget-build-notes.md](ew_wiki/docs/widget-build-notes.md), read before starting any new widget.

`ai-workflow-audit` (root-level map, `ai-workflow-audit/map.md`) round 2: this HANDOFF used to say ticket 17 was partway through its own checklist — checked while writing this update, and the map itself says otherwise: "ticket 17 ... is also resolved. Nothing currently fog." Correcting the stale claim rather than repeating it. No open frontier on that map as of this check.

## Uncommitted / in progress

Nothing uncommitted as of this update — both bodies of work below landed as two separate commits (the maintainer chose "split by body of work" over one mega-commit or leaving it uncommitted). `.agents/hooks/ew_toolkit/guard-shared-verify-all-tools.cjs` and `guard-script-block-header-comment.cjs` live outside this git repo entirely (the project root isn't a git repo), so they were never part of either commit — no action needed there, just noting it so a future session doesn't go looking for them in `git log`.

- Commit 1 (backlog): everything from resolving [ticket 21](.scratch/ew_toolkit/issues/21-unify-hub-tool-nav-bar.md), [ticket 22](.scratch/ew_toolkit/issues/22-unify-favicon.md), and [ticket 23](.scratch/ew-wiki-real-build/issues/23-header-toc-layout-rework.md) — nav bar unification, favicon dedup, header/TOC layout rework (all 6+ rounds). Includes `shared/navBar.ts`, `shared/theme.ts`, `shared/favicon.png`, `scripts/sync-favicon.mjs`, `docs/agents/hub-tool-nav.md`, `src/nav.ts`, `src/style.css`, `package.json`/`ewp_validator/package.json`/`ew_wiki/package.json`, `ewp_validator/src/main.ts`+`style.css`, `ew_wiki/astro.config.mjs`, `ew_wiki/src/components/{Header,CollapsibleToc,PageTitle,PageSidebar}.astro`, `ew_wiki/src/styles/theme.css`, `shared/theme.css`, `shared/icons.ts`, `ew_wiki/docs/widget-build-notes.md`, favicon swap, both ticket files and their maps. Note: ticket 23 and tickets 21/22 turned out to have edited the same lines in `.claude/settings.json` and root `AGENTS.md` in alternation (interleaved sessions) — not worth a risky manual line-level split, so they're one combined commit rather than three.
- Commit 2: the [Ew Wiki Content Quality Pass](.scratch/ew-wiki-content-quality-pass/map.md) work — see "Where things stand" above.

## Next step

The nav-bar/favicon/header-TOC backlog and the content-quality-pass are both committed and done. `ai-workflow-audit` has no open frontier (see the correction above — don't repeat the stale "ticket 17 partway" claim this file used to carry). Remaining open item: the content-quality-pass map's own fog — deciding which of the 18 bad-cop sweep findings to act on (see that map's "Not yet specified").

## Don't touch

(none currently — the nav-bar/layout-bugs park lifted 2026-09-11, see Next step)

## Dual-agent note

If a Cursor session picks this up instead of Claude Code: pull first. Standing-rule file sync (`AGENTS.md`/`CLAUDE.md`/`CONTEXT.md`/`docs/agents/`) is hook-enforced now (`guard-standing-rules-sync.cjs`, blocks session end on drift) — see `docs/agents/hooks-vs-rules.md`.
