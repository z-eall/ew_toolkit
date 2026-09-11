# Handoff

Last updated: 2026-09-11, mid-session on ai-workflow-audit round 2, ticket 17 (hook-testing/deduping the existing rule and hook corpus).

## Where things stand

The `ew_wiki` interactive-widget phase (tickets 17-22 on the [Ew Wiki Real Build map](.scratch/ew-wiki-real-build/map.md)) is fully closed — no open widget ticket. Lessons from that phase now live in [ew_wiki/docs/widget-build-notes.md](ew_wiki/docs/widget-build-notes.md), read before starting any new widget.

`ai-workflow-audit` (root-level map, `ai-workflow-audit/map.md`) round 2 is in progress: tickets 12-16 resolved, ticket 17 (execution) partway through its own checklist — see that ticket's own Progress log for exactly what's done vs. open.

## Uncommitted / in progress

Nothing uncommitted in this worktree as of this update — last commit is the standing-rules-sync hook wiring.

## Next step

Continue ticket 17's remaining checklist (see `ai-workflow-audit/issues/17-dedupe-rule-corpus.md`) — hook-test the rest of the rule corpus, build the remaining new hooks tickets 13/15 call for, confirm corpus size, set up the ticket-16 Routine. Otherwise: whatever the maintainer names next; no other open ticket exists on any map right now.

## Don't touch

`ew_toolkit`'s nav bar and the 5 reported `ew_wiki` layout bugs — parked pending `ai-workflow-audit`'s output, per that map's own Decisions-so-far.

## Dual-agent note

If a Cursor session picks this up instead of Claude Code: pull first. Standing-rule file sync (`AGENTS.md`/`CLAUDE.md`/`CONTEXT.md`/`docs/agents/`) is hook-enforced now (`guard-standing-rules-sync.cjs`, blocks session end on drift) — see `docs/agents/hooks-vs-rules.md`.
