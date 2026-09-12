# Handoff

Last updated: 2026-09-12, after fixing `ewp_validator`'s schema for EWP v1.60's new `log:` field.

## Where things stand

**This session**: maintainer reported Valheim and EWP both got updates and asked for fixes. Checked EWP's real GitHub source (`JereKuusela/valheim-expand_world_prefabs`) field-by-field against `ewp_validator`'s hand-maintained schema (`ewp_validator/schema/generate.mjs` — a deliberately static schema, doesn't auto-track new EWP fields, see that file's own header comment). Didn't need to touch Valheim's own game code — EWP already absorbed the game-update changes internally (its CHANGELOG says v1.60 "Fixes for the new game update"); the validator only needs to track EWP's own script surface. Found one real gap: `log:`, a new top-level action (`PrefabData.cs:50`) that writes a line to `ewp_log.txt` instead of a chat command — was missing from the schema, so any script using it got a false "unknown field" error. Everything else new in v1.59/v1.60 (`random:` on pokes, alt-biome support on `biomes:`/`bannedBiomes:`) was already correctly handled.

Fixed in two commits, pushed to `origin/main`:
- `84825e4` — added `log: str` to the schema's Actions section, regenerated `schema.generated.json` (confirms EWP 1.60.0), slotted `log` into the root `AGENTS.md` script field-order convention (right after `command`/`commands`, maintainer's call), synced that same line to the `ew_toolkit-cursor` worktree's copy of `AGENTS.md` (left **uncommitted** there deliberately — that branch belongs to the Cursor agent, not this session, per the one-agent-at-a-time rule).
- `4bc28f3` — caught this file itself sitting modified-but-uncommitted from the prior session (documented the tickets 06-13 push) and committed it before starting today's work.

Per maintainer's explicit call, did **not** add wiki teaching content for `log:` — validator fix only for now; a `log:` teaching page is a separate future decision, not chartered anywhere yet.

**Known gap this session hit**: couldn't run `ewp_validator`'s actual test suite locally — `vitest` fails to start on this Windows checkout (`Cannot find native binding` / `@rolldown/binding-wasm32-wasi`), the same class of issue as the existing "this repo's lock must be built on Linux" note. Hand-verified the `log:` schema fix instead with a direct Ajv compile+validate check. **Next session on a Windows checkout should expect the same vitest failure** — real test suite needs WSL/Linux, same as the wiki's dev server.

**CI caught something local checks missed**: the push above triggered a real CI failure (run `34701323651`) — 2 tests in `rpcValidation.test.ts` failed because upstream `RPCs.md` now documents `RPC_SetVisualItem`'s 2nd param as type `hash`, not `string` (confirmed live against the doc and against `RpcInfo.cs`'s `Types` set, which treats `hash`/`string` as genuinely different — `hash` applies `GetStableHashCode()`). This is exactly the kind of EWP-update drift the maintainer flagged this session; CI's live `docs/RPCs.md` fetch (via `schema/generate.mjs`) surfaced it since the hardcoded test expectations hadn't been updated. Fixed both assertions to expect `hash`; pushed as a follow-up commit. **Still unverified locally** (same vitest breakage) — check CI on the next push to confirm green.

## Prior sessions

Committed and pushed today, three commits total on top of origin/main (12 older ones plus this session's): (1)+(2) the nav-bar/favicon/header-TOC backlog and the content-quality-pass's first pass (3 wording fixes, new teaching content, 2 bad-cop examples, the 18-item sweep) — both already described lower in this file from the prior session; (3) **this session**: resolved the map's remaining 8 tickets (06-13), adding WRONG/CORRECT bad-cop pairs across 15 `ew_wiki` concept/example pages. Each claim was cross-checked against the mod's real C# source after an earlier prototype pass had wrongly claimed `<par2>` "fails to resolve" (it doesn't — `Functions.cs` has it as a real hardcoded shortcut); that pair was dropped instead of shipped. Also retired a planned bad-cop pair on `basic-rng.mdx` (weight-sum-under-1 isn't actually a mistake — logged as Out of scope on the map instead). Pushed to `origin/main` (`fe4e468`); GitHub Pages should pick it up automatically.

**The content-quality-pass map's destination is now fully met** — all 12 of its tickets are closed. One fog item remains un-ticketed on the map itself (not a task, just noted): re-checking the original 18-item sweep report for other unverified "definition"-style claims, same class of error as the `<par2>` and comma/semicolon mistakes.

Prior narrative on the backlog commit (ticket 23 round 7.5 wrap-up):

Ticket 23 (`ew_wiki` header/TOC layout) has gone through 7.5 rounds today — see the ticket file for the full detail on each. Round 6 checked mobile width (375px) and fixed 2 real overlap bugs there. Round 7: the maintainer caught the theme toggle rendering as a colorful emoji on ew_wiki vs. a plain symbol on landing/validator — root cause was `shared/theme.css`'s `.theme-toggle` rule inheriting `font-family` from whichever host page it's dropped into; fixed by pinning `font-family` explicitly on `.site-nav` as a whole. Round 7.5: checking landing/validator as asked (not just re-trusting the round-7 close-out) found that fix hadn't actually reached the button on landing — `<button>` elements never inherit `font-family` from ancestors by default in any browser, so the pin on `.site-nav` (a `<div>`) never reached its child button; `ew_wiki` and `ewp_validator` only "verified fine" in round 7 because each happens to carry its own separate button-font reset that landing doesn't have. Fixed by restoring an explicit `font-family: inherit` on `.theme-toggle` itself, on top of the bar-level pin.

**Ticket 23 has no more known open issues** as of round 7.5 — see the ticket file for the full verification detail on every round, including the live re-check across all 3 pages (identical 53px nav height, identical computed button font, zero console errors on landing/validator/wiki).

**New hub-level hook**: `guard-shared-verify-all-tools.cjs` (`.agents/hooks/ew_toolkit/`, wired in both `settings.json` files as `PostToolUse` on `Edit|Write`). Fires whenever a `shared/` file changes, reminding to verify computed styles live on all 3 Tools before calling the change done — the trigger (a file path under `shared/`) is mechanical, so per `docs/agents/hooks-vs-rules.md`'s test it earned a hook, not just a memory. Smoke-tested (fires on a `shared/` path in either worktree, silent on unrelated paths) before wiring. Also added a one-sentence cross-reference in `AGENTS.md`'s "Shared visual identity" mechanism pointing at it, and logged the hook's own entry in `docs/agents/hooks-vs-rules.md`.

The `ew_wiki` interactive-widget phase (tickets 17-22 on the [Ew Wiki Real Build map](.scratch/ew-wiki-real-build/map.md)) is otherwise closed. Lessons from that phase live in [ew_wiki/docs/widget-build-notes.md](ew_wiki/docs/widget-build-notes.md), read before starting any new widget.

`ai-workflow-audit` (root-level map, `ai-workflow-audit/map.md`) round 2: this HANDOFF used to say ticket 17 was partway through its own checklist — checked while writing this update, and the map itself says otherwise: "ticket 17 ... is also resolved. Nothing currently fog." Correcting the stale claim rather than repeating it. No open frontier on that map as of this check.

## Uncommitted / in progress

Nothing uncommitted, nothing unpushed — `git status` is clean and `main` matches `origin/main` as of this update. `.agents/hooks/ew_toolkit/guard-shared-verify-all-tools.cjs` and `guard-script-block-header-comment.cjs` still live outside this git repo entirely (the project root isn't a git repo), so they're not in `git log` — no action needed, just noting it so a future session doesn't go looking for them there.

- Commit 1 (backlog): everything from resolving [ticket 21](.scratch/ew_toolkit/issues/21-unify-hub-tool-nav-bar.md), [ticket 22](.scratch/ew_toolkit/issues/22-unify-favicon.md), and [ticket 23](.scratch/ew-wiki-real-build/issues/23-header-toc-layout-rework.md) — nav bar unification, favicon dedup, header/TOC layout rework (all 6+ rounds). Includes `shared/navBar.ts`, `shared/theme.ts`, `shared/favicon.png`, `scripts/sync-favicon.mjs`, `docs/agents/hub-tool-nav.md`, `src/nav.ts`, `src/style.css`, `package.json`/`ewp_validator/package.json`/`ew_wiki/package.json`, `ewp_validator/src/main.ts`+`style.css`, `ew_wiki/astro.config.mjs`, `ew_wiki/src/components/{Header,CollapsibleToc,PageTitle,PageSidebar}.astro`, `ew_wiki/src/styles/theme.css`, `shared/theme.css`, `shared/icons.ts`, `ew_wiki/docs/widget-build-notes.md`, favicon swap, both ticket files and their maps. Note: ticket 23 and tickets 21/22 turned out to have edited the same lines in `.claude/settings.json` and root `AGENTS.md` in alternation (interleaved sessions) — not worth a risky manual line-level split, so they're one combined commit rather than three.
- Commit 2: the content-quality-pass's first pass (tickets 01-05) — see prior handoff narrative above.
- Commit 3 (`fe4e468`, this session): content-quality-pass tickets 06-13, all 8 bad-cop tickets — see "Where things stand" above.

All three pushed to `origin/main` this session (13 commits went out together, since 1 and 2 were sitting locally, committed but unpushed, from before).

## Next step

**Check CI on the next push** (or `gh run list` now) — confirm the `rpcValidation.test.ts` fix actually turned the build green; it was pushed but not yet re-verified as of this update. If it's still red, don't assume it's the same `hash`/`string` issue — read the new log first.

The nav-bar/favicon/header-TOC backlog and the content-quality-pass map are both fully done and live. `ai-workflow-audit` has no open frontier (see the correction above — don't repeat the stale "ticket 17 partway" claim this file used to carry). No open ticket anywhere in the repo right now. Two loose threads, neither chartered as a ticket yet:
- The content-quality-pass map's own fog note: whether to re-check the original 18-item sweep report for other unverified claims like the two caught this session (`<par2>`, the comma/semicolon filter wording).
- Whether `ewp_validator`'s hand-maintained schema (`schema/generate.mjs`) should get a periodic "diff against EWP's real field list" check, rather than waiting for a maintainer to notice drift like `log:` by chance — this session found one gap by manual field-by-field comparison; there's no standing process to catch the next one.

## Don't touch

(none currently — the nav-bar/layout-bugs park lifted 2026-09-11, see Next step)

## Dual-agent note

If a Cursor session picks this up instead of Claude Code: pull first. Standing-rule file sync (`AGENTS.md`/`CLAUDE.md`/`CONTEXT.md`/`docs/agents/`) is hook-enforced now (`guard-standing-rules-sync.cjs`, blocks session end on drift) — see `docs/agents/hooks-vs-rules.md`.
