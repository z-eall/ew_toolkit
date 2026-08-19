# EW Toolkit — Cursor agent notes

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/`. See `../docs/agents/issue-tracker.md` (parent Claude workspace) or `.scratch/` tickets in this repo.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `../docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `.scratch/` ADRs at the repo root. See `../docs/agents/domain.md`.

## Dual-agent workflow (Cursor ↔ Claude Code)

- **One agent at a time** per project folder — never run Cursor and Claude Code on the same folder simultaneously.
- **Commit + push before switching** agents; **pull when opening** the other agent.
- Update `HANDOFF.md` at the end of every session so the next agent can continue.
- This worktree is on branch `cursor/work`; Claude Code typically works from `main` in the sibling `ew_toolkit` folder.
