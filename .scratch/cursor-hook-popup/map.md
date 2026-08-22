# Map: Cursor browser keeps showing block-dangerous-git.sh

Labels: `wayfinder:map`

## Destination

You know **why** the Cursor browser / hooks panel keeps showing `block-dangerous-git.sh`, and you have a chosen fix so it stops nagging you in Cursor **without** losing git safety in Claude Code (if you still want it there).

## Notes

- **Domain**: dual-agent setup (Cursor + Claude Code), not EWP Validator product code.
- **Skills**: grilling, handoff
- **Standing preferences**: plain language; one agent at a time per project folder.
- **What the scripter sees**: a panel / pop-up that names `block-dangerous-git.sh` again and again while Cursor Agent runs shell commands.

## Decisions so far

- [Why does Cursor keep showing the hook?](issues/01-why-cursor-shows-block-dangerous-git.md) — Cursor loads **global Claude Code hooks** from `~/.claude/settings.json`; every Agent shell command runs that script (~0.5s); Cursor's hooks panel logs the command name each time. Not a browser bug — expected hook UI noise.
- [Where should git guardrails live?](issues/02-where-should-git-guardrails-live.md) — **Git guardrail off.** Removed only `block-dangerous-git.sh` from global hooks; kept `rtk hook claude`.

## Not yet specified
- Whether to fix the broken `.cursor/hooks.json` parse error in Cursor logs (file missing — harmless noise).

## Out of scope

- Rewriting what `block-dangerous-git.sh` blocks (patterns are fine).
- Cursor Hooks feature design feedback to Cursor the company.
