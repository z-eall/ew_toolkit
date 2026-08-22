# Where should git guardrails live for Cursor vs Claude Code?

Type: grilling
Status: resolved
Blocked by: 01

## Question

Now that we know Cursor runs global Claude hooks, where should `block-dangerous-git.sh` live?

## Answer

Removed only `block-dangerous-git.sh` from `C:\Users\Ultimate\.claude\settings.json`.

**Kept:** `rtk hook claude` (not part of this issue).

- Cursor Hooks panel should stop showing `block-dangerous-git.sh` on every shell command after hooks reload (restart Cursor or open a new Agent chat if it persists).
- Claude Code no longer runs the git guardrail pre-shell hook.
- Git safety relies on Cursor user rules, manual care, and asking the agent before destructive git.

Script file left at `~/.claude/hooks/block-dangerous-git.sh` on disk — inactive until re-installed via `/git-guardrails-claude-code`.
