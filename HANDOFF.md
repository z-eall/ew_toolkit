# Handoff — 2026-08-22

## Last agent

Claude Code

## What I was doing

Restructured standing rules for a real dual-agent workflow: moved everything
that isn't Claude-specific out of `CLAUDE.md` and into `AGENTS.md` (the file
Cursor actually reads), at both the hub level and `ewp_validator/` level.
`CLAUDE.md` in both spots is now just a short `@AGENTS.md` import. Along the
way, recovered three sessions' worth of uncommitted work that had been
sitting in this worktree unlogged (the real confirm-modal prototype,
cursor-hook-popup, cursor-skill-parity), and removed the "When a skill is
active" / "How to talk to the scripter" sections from `AGENTS.md` at the
scripter's request — note the tradeoff below.

## Current state

- [x] `AGENTS.md` (root + `ewp_validator/`) holds all shared rules; `CLAUDE.md` at both levels slimmed to an import.
- [x] `docs/agents/` copied into this repo (both worktrees) so `AGENTS.md`'s pointers resolve without reaching outside the repo.
- [x] `cursor/work` and `main` merged both directions — fully in sync as of commit below.
- [x] Recovered work committed: `.scratch/confirm-modal-large-list` (the real prototype, superseding `main`'s secondhand reconstruction), `.scratch/cursor-hook-popup`, `.scratch/cursor-skill-parity`.
- [x] Both branches pushed to `origin`.

## Next step

Nothing blocking. If Cursor's skill formats (grilling ❓/➡️ rounds, wayfinder auto-advance) start getting silently overridden by plain-chat behavior again, that's the exact failure `cursor-skill-parity` diagnosed and fixed — the fix (two `AGENTS.md` sections) was removed this session on purpose. Re-read `.scratch/cursor-skill-parity/map.md` before re-adding anything, since the new `AGENTS.md` doesn't carry a similar plain-chat rule and may not need the same fix.

## Don't touch

Nothing in-progress elsewhere right now.

## Git checkpoint

- Branch: `cursor/work`
- Last commit: run `git log -1 --oneline` (this session ended on the merge that brought `main`'s AGENTS.md restructure in)
- Uncommitted changes: none — working tree clean, both branches pushed
