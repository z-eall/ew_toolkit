# Why does Cursor keep showing block-dangerous-git.sh?

Type: research
Status: resolved

## Question

Why does the Cursor browser / panel keep popping up `block-dangerous-git.sh`?

## Answer

**Not a bug in the script. Cursor is running your Claude Code safety hook on every Agent shell command.**

### What happened

1. You (via Claude Code) ran **`/git-guardrails-claude-code`** with **global** scope.
2. That wrote two hooks into `C:\Users\Ultimate\.claude\settings.json`:
   - `rtk hook claude`
   - `~/.claude/hooks/block-dangerous-git.sh`
3. **Cursor 3.16+ loads those same Claude user hooks** (`Loaded Claude user hooks` in Cursor logs).
4. Every time Cursor Agent uses the **Shell** tool, both hooks run first (~0.5–1.4s each).
5. Cursor's **Hooks output panel** prints a block like:
   ```
   Command: ~/.claude/hooks/block-dangerous-git.sh (521ms) exit code: 0
   ```
   That is the "pop up" you keep seeing — hook activity UI, not the script opening in the browser.

### Evidence

- Cursor log: `Claude user config path: c:\Users\Ultimate\.claude\settings.json`
- Cursor log: `Found 2 hook(s) to execute for step: preToolUse` → both from `claude-user config`
- Hook script path: `C:\Users\Ultimate\.claude\hooks\block-dangerous-git.sh`
- Exit code 0 = command was **allowed**; panel still shows every run.

### Fix options (for ticket 02)

| Option | Effect |
|--------|--------|
| **A — Claude Code only** | Remove hooks from `~/.claude/settings.json`. Add them to `Claude/ew_toolkit/.claude/settings.json` instead. Cursor worktree does not use that file → quiet in Cursor, guardrails stay in Claude Code on ew_toolkit. |
| **B — Turn off globally** | Delete the hook block from `~/.claude/settings.json`. Quiet everywhere. Cursor user rules already limit bad git commands. |
| **C — Live with it** | Keep hook; close or ignore Cursor Hooks panel. |

**Recommended for your dual-agent workflow: Option A.**
