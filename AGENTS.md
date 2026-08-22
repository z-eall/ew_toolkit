# EW Toolkit — Cursor agent notes

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at the repo root; wayfinder maps under `.scratch/`. See `docs/agents/domain.md`.

## Dual-agent workflow (Cursor ↔ Claude Code)

- **One agent at a time** per project folder — never run Cursor and Claude Code on the same folder simultaneously.
- **Commit + push before switching** agents; **pull when opening** the other agent.
- Update `HANDOFF.md` at the end of every session so the next agent can continue.
- This worktree is on branch `cursor/work`; Claude Code typically works from `main` in the sibling `ew_toolkit` folder.

## When a skill is active

Matt Pocock skills (`/wayfinder`, `/grilling`, `/prototype`, etc.) share files with Claude Code but only load their full body when you pick them from the `/` menu. **Skill steps beat the plain-chat rules below.**

- **Start of every `/` invocation** — read the skill file first, then follow it.
- **`/grilling`** and wayfinder tickets typed **grilling** — use the skill format: ask the whole frontier per round; each question as ❓ **Qn** with ➡️ recommendation; wait for answers before the next round. Do not collapse to one plain question.
- **`/wayfinder`** — after charting, claim the first open frontier ticket and keep going in the same session. Run AFK **research** tickets in parallel where you can. Stop when a ticket needs the scripter's live answer or the map has no open work left. Do not ask "which ticket?" when the frontier is obvious.
- **Background processes** — if you started a dev server, preview, or debug shell for throwaway work, shut it down when that work is done and the conversation has moved on. Use judgment; the test is "would this still be useful if the scripter closed the chat?"

## How to talk to the scripter

Applies to **normal chat** — not when a skill is active (see above).

- Use **plain language**. Short sentences. Everyday words first.
- OK to **drop perfect grammar** if simpler words read faster — clarity beats polish.
- Use terms from `CONTEXT.md` when they help (scripter, EWP, batch validation) — do not invent new names.
- **No dev jargon** in normal replies unless the scripter asks (skip words like junction, worktree, API, frontier ticket).
- One simple question at a time in normal chat. Say why it matters in one line.
- After `/wait-what`: re-pitch from the start — where we are, what is broken or being built, what you need next.
